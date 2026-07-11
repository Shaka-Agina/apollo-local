import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { slskd } from "@/lib/slskd";

export interface LocalFile {
  name: string;
  /** Path relative to the downloads dir, backslash-separated (playable via /api/audio). */
  relativePath: string;
  size: number;
  modifiedAt: string;
}

export interface LocalFolder {
  name: string;
  files: LocalFile[];
  totalSize: number;
  /** Relative path of the folder's cover image, if one exists. */
  cover: string | null;
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;
const COVER_HINT = /(cover|front|folder|album)/i;

function pickCover(files: { name: string; relativePath: string }[]): string | null {
  const images = files.filter((f) => IMAGE_EXT.test(f.name));
  if (images.length === 0) return null;
  const hinted = images.find((f) => COVER_HINT.test(f.name));
  return (hinted ?? images[0]).relativePath;
}

// GET /api/library/downloads — folders and files inside the downloads dir
export async function GET() {
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

  const entries = await fs.readdir(downloadsDir, { withFileTypes: true }).catch(
    () => []
  );

  const folders: LocalFolder[] = [];
  const rootFiles: LocalFile[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const folderPath = path.join(downloadsDir, entry.name);
      const inner = await fs
        .readdir(folderPath, { withFileTypes: true })
        .catch(() => []);

      const files: LocalFile[] = [];
      for (const f of inner) {
        if (!f.isFile()) continue;
        const stat = await fs.stat(path.join(folderPath, f.name)).catch(() => null);
        if (!stat) continue;
        files.push({
          name: f.name,
          relativePath: `${entry.name}\\${f.name}`,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        });
      }
      files.sort((a, b) => a.name.localeCompare(b.name));

      folders.push({
        name: entry.name,
        files,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        cover: pickCover(files),
      });
    } else if (entry.isFile()) {
      const stat = await fs.stat(path.join(downloadsDir, entry.name)).catch(
        () => null
      );
      if (!stat) continue;
      rootFiles.push({
        name: entry.name,
        relativePath: entry.name,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      });
    }
  }

  folders.sort((a, b) => a.name.localeCompare(b.name));
  rootFiles.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ downloadsDir, folders, rootFiles });
}
