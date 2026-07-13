import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { slskd } from "@/lib/slskd";
import {
  COVER_FILE,
  META_FILE,
  invalidateLibraryCache,
  resolveUnderDownloads,
  type AlbumMeta,
} from "@/lib/local-library";

interface ItunesResult {
  collectionName?: string;
  trackName?: string;
  artistName?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  artworkUrl100?: string;
}

/**
 * POST /api/library/metadata
 * body: { folderRelativePath: string, query?: string }
 * Fetches album art/metadata (iTunes Search) and writes into the album folder.
 */
export async function POST(req: NextRequest) {
  let downloadsDir: string | undefined;
  try {
    const options = await slskd<{ directories?: { downloads?: string } }>(
      "/options"
    );
    downloadsDir = options.directories?.downloads;
  } catch {
    return NextResponse.json({ error: "slskd unreachable" }, { status: 502 });
  }
  if (!downloadsDir) {
    return NextResponse.json({ error: "No downloads directory" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const folderRelativePath =
    typeof body?.folderRelativePath === "string"
      ? body.folderRelativePath.trim()
      : "";
  if (!folderRelativePath) {
    return NextResponse.json(
      { error: "folderRelativePath is required" },
      { status: 400 }
    );
  }

  const folderAbs = resolveUnderDownloads(downloadsDir, folderRelativePath);
  if (!folderAbs) {
    return NextResponse.json({ error: "Invalid folder path" }, { status: 400 });
  }
  const st = await fs.stat(folderAbs).catch(() => null);
  if (!st?.isDirectory()) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const parts = folderRelativePath.split(/[\\/]/).filter(Boolean);
  const albumGuess = parts[parts.length - 1] ?? "";
  const artistGuess = parts.length >= 2 ? parts[parts.length - 2] : "";
  const query =
    typeof body?.query === "string" && body.query.trim()
      ? body.query.trim()
      : [artistGuess, albumGuess].filter(Boolean).join(" ");

  if (!query) {
    return NextResponse.json({ error: "Nothing to search for" }, { status: 400 });
  }

  const searchUrl =
    "https://itunes.apple.com/search?" +
    new URLSearchParams({
      term: query,
      entity: "album",
      limit: "5",
    }).toString();

  const itunesRes = await fetch(searchUrl, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  }).catch(() => null);

  if (!itunesRes?.ok) {
    return NextResponse.json(
      { error: "Metadata lookup failed" },
      { status: 502 }
    );
  }

  const itunesJson = (await itunesRes.json()) as {
    results?: ItunesResult[];
  };
  const hit = itunesJson.results?.[0];
  if (!hit) {
    return NextResponse.json(
      { error: "No metadata found for that album" },
      { status: 404 }
    );
  }

  let coverFile: string | undefined;
  const artUrl = hit.artworkUrl100?.replace("100x100bb", "600x600bb");
  if (artUrl) {
    const artRes = await fetch(artUrl).catch(() => null);
    if (artRes?.ok) {
      const buf = Buffer.from(await artRes.arrayBuffer());
      await fs.writeFile(path.join(folderAbs, COVER_FILE), buf);
      coverFile = COVER_FILE;
    }
  }

  const meta: AlbumMeta = {
    title: hit.collectionName ?? albumGuess,
    artist: hit.artistName ?? (artistGuess || undefined),
    year: hit.releaseDate?.slice(0, 4),
    genre: hit.primaryGenreName,
    coverFile,
    source: "itunes",
    fetchedAt: new Date().toISOString(),
  };

  await fs.writeFile(
    path.join(folderAbs, META_FILE),
    JSON.stringify(meta, null, 2),
    "utf8"
  );

  invalidateLibraryCache(downloadsDir);

  return NextResponse.json({
    ok: true,
    meta,
    coverRelativePath: coverFile
      ? `${folderRelativePath}\\${coverFile}`.replace(/\//g, "\\")
      : null,
  });
}
