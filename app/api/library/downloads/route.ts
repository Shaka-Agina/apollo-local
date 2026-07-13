import { NextRequest, NextResponse } from "next/server";
import { slskd } from "@/lib/slskd";
import {
  loadAlbumFolder,
  scanDownloadsLibrary,
} from "@/lib/local-library";

let cachedDir: { value: string | null; at: number } | null = null;
const DIR_TTL_MS = 60_000;

async function downloadsDir(): Promise<string | null> {
  const now = Date.now();
  if (cachedDir && now - cachedDir.at < DIR_TTL_MS) {
    return cachedDir.value;
  }
  try {
    const options = await slskd<{ directories?: { downloads?: string } }>(
      "/options"
    );
    const value = options.directories?.downloads ?? null;
    cachedDir = { value, at: now };
    return value;
  } catch {
    cachedDir = { value: null, at: now };
    return null;
  }
}

// GET /api/library/downloads — light album index (+ optional ?album=rel\path for detail)
export async function GET(req: NextRequest) {
  const dir = await downloadsDir();
  if (dir === null) {
    return NextResponse.json({ error: "slskd unreachable" }, { status: 502 });
  }
  if (!dir) {
    return NextResponse.json({ error: "No downloads directory" }, { status: 500 });
  }

  const albumPath = req.nextUrl.searchParams.get("album");
  if (albumPath) {
    const folder = await loadAlbumFolder(dir, albumPath);
    if (!folder) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }
    return NextResponse.json({ folder });
  }

  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  const { folders, rootFiles } = await scanDownloadsLibrary(dir, {
    bypassCache: refresh,
  });
  return NextResponse.json({ downloadsDir: dir, folders, rootFiles });
}
