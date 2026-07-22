import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { parseFile } from "music-metadata";
import { slskd } from "@/lib/slskd";
import { resolveUnderDownloads } from "@/lib/local-library";
import {
  DATA_SAVER_BITRATE_KBPS,
  estimateDataSaverBytes,
  parseStreamQuality,
  shouldTranscode,
} from "@/lib/stream-quality";
import { ffmpegAvailable } from "@/lib/transcode";

async function resolveLocalPath(fileParam: string): Promise<string | null> {
  const options = await slskd<{ directories?: { downloads?: string } }>(
    "/options"
  );
  const downloadsDir = options.directories?.downloads;
  if (!downloadsDir) return null;

  const direct = resolveUnderDownloads(downloadsDir, fileParam);
  if (direct) {
    const ok = await fs
      .stat(direct)
      .then((s) => s.isFile())
      .catch(() => false);
    if (ok) return direct;
  }

  const segments = fileParam.split(/[\\/]/).filter(Boolean);
  const basename = segments[segments.length - 1];
  const folder = segments.length > 1 ? segments[segments.length - 2] : "";
  return resolveUnderDownloads(
    downloadsDir,
    folder ? `${folder}\\${basename}` : basename
  );
}

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get("file");
  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const quality = parseStreamQuality(req.nextUrl.searchParams.get("quality"));
  const ext = file.split(".").pop()?.toLowerCase() ?? "";

  let localPath: string | null;
  try {
    localPath = await resolveLocalPath(file);
  } catch {
    return NextResponse.json({ error: "slskd unreachable" }, { status: 502 });
  }
  if (!localPath) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const stat = await fs.stat(localPath).catch(() => null);
  if (!stat?.isFile()) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  let duration = 0;
  let bitrateKbps: number | null = null;
  try {
    const meta = await parseFile(localPath, { duration: true });
    duration = meta.format.duration ?? 0;
    if (meta.format.bitrate) {
      bitrateKbps = Math.round(meta.format.bitrate / 1000);
    }
  } catch {
    /* tags optional */
  }

  const willTranscode =
    shouldTranscode(ext, quality) && (await ffmpegAvailable());
  const streamBitrateKbps = willTranscode
    ? DATA_SAVER_BITRATE_KBPS
    : bitrateKbps;
  const streamBytes = willTranscode
    ? estimateDataSaverBytes(duration) ||
      Math.round(stat.size * (DATA_SAVER_BITRATE_KBPS / Math.max(bitrateKbps ?? 1000, 1)))
    : stat.size;

  return NextResponse.json({
    file,
    format: ext,
    originalBytes: stat.size,
    duration,
    originalBitrateKbps: bitrateKbps,
    quality: willTranscode ? "data-saver" : quality === "data-saver" ? "passthrough" : "original",
    streamBitrateKbps,
    streamBytes,
    transcoding: willTranscode,
  });
}
