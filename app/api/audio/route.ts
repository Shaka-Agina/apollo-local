import { NextRequest, NextResponse } from "next/server";
import { createReadStream, promises as fs } from "fs";
import { Readable } from "stream";
import { slskd } from "@/lib/slskd";
import { resolveUnderDownloads } from "@/lib/local-library";
import {
  parseStreamQuality,
  shouldTranscode,
} from "@/lib/stream-quality";
import { ensureDataSaverCache, ffmpegAvailable } from "@/lib/transcode";

const MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  flac: "audio/flac",
  ogg: "audio/ogg",
  opus: "audio/opus",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  wma: "audio/x-ms-wma",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

/**
 * Resolves a library relative path (Artist\Album\track.mp3) under downloads.
 * Falls back to legacy slskd layout (<downloads>/<last folder>/<basename>).
 */
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

function serveFile(
  localPath: string,
  mime: string,
  size: number,
  range: string | null,
  extraHeaders: Record<string, string> = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": mime.startsWith("image/")
      ? "private, max-age=3600"
      : "private, max-age=300",
    ...extraHeaders,
  };

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? parseInt(match[1], 10) : 0;
    const end = match?.[2] ? parseInt(match[2], 10) : size - 1;

    if (start >= size || end >= size || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }

    const stream = Readable.toWeb(
      createReadStream(localPath, { start, end })
    ) as ReadableStream;

    return new NextResponse(stream, {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(localPath)) as ReadableStream;
  return new NextResponse(stream, {
    status: 200,
    headers: { ...headers, "Content-Length": String(size) },
  });
}

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get("file");
  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME[ext];
  if (!mime) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }

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

  const quality = parseStreamQuality(req.nextUrl.searchParams.get("quality"));
  const range = req.headers.get("range");
  const isImage = mime.startsWith("image/");

  if (
    !isImage &&
    shouldTranscode(ext, quality) &&
    (await ffmpegAvailable())
  ) {
    try {
      const cached = await ensureDataSaverCache(localPath, stat.mtimeMs);
      const cachedStat = await fs.stat(cached);
      return serveFile(cached, "audio/ogg", cachedStat.size, range, {
        "X-Apollo-Quality": "data-saver",
        "X-Apollo-Original-Size": String(stat.size),
        "X-Apollo-Original-Format": ext,
      });
    } catch {
      // Fall through to original if ffmpeg fails mid-encode.
    }
  }

  return serveFile(localPath, mime, stat.size, range, {
    "X-Apollo-Quality":
      !isImage && shouldTranscode(ext, quality) ? "original-fallback" : quality,
    "X-Apollo-Original-Size": String(stat.size),
    "X-Apollo-Original-Format": ext,
  });
}
