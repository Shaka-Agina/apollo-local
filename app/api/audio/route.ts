import { NextRequest, NextResponse } from "next/server";
import { createReadStream, promises as fs } from "fs";
import path from "path";
import { Readable } from "stream";
import { slskd } from "@/lib/slskd";

const MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  flac: "audio/flac",
  ogg: "audio/ogg",
  opus: "audio/opus",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  wma: "audio/x-ms-wma",
  // Cover art
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

/**
 * Resolves a remote Soulseek filename to its local path. slskd saves files as
 * <downloads>/<last remote folder>/<basename>.
 */
async function resolveLocalPath(remoteFilename: string): Promise<string | null> {
  const options = await slskd<{ directories?: { downloads?: string } }>(
    "/options"
  );
  const downloadsDir = options.directories?.downloads;
  if (!downloadsDir) return null;

  const segments = remoteFilename.split(/[\\/]/).filter(Boolean);
  const basename = segments[segments.length - 1];
  const folder = segments.length > 1 ? segments[segments.length - 2] : "";

  const candidate = path.resolve(path.join(downloadsDir, folder, basename));

  // Never serve anything outside the downloads directory.
  const root = path.resolve(downloadsDir);
  if (!candidate.startsWith(root + path.sep)) return null;

  return candidate;
}

// GET /api/audio?file=<remote filename> — streams a downloaded file,
// with Range support so seeking works.
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

  const range = req.headers.get("range");
  const headers: Record<string, string> = {
    "Content-Type": mime,
    "Accept-Ranges": "bytes",
    // Cover art can be cached; audio should always stream fresh.
    "Cache-Control": mime.startsWith("image/")
      ? "private, max-age=3600"
      : "no-store",
  };

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? parseInt(match[1], 10) : 0;
    const end = match?.[2] ? parseInt(match[2], 10) : stat.size - 1;

    if (start >= stat.size || end >= stat.size || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${stat.size}` },
      });
    }

    const stream = Readable.toWeb(
      createReadStream(localPath, { start, end })
    ) as ReadableStream;

    return new NextResponse(stream, {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(localPath)) as ReadableStream;
  return new NextResponse(stream, {
    status: 200,
    headers: { ...headers, "Content-Length": String(stat.size) },
  });
}
