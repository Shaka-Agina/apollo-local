import { promises as fs } from "fs";
import path from "path";

export interface LocalFile {
  name: string;
  /** Path relative to the downloads dir, backslash-separated (playable via /api/audio). */
  relativePath: string;
  size: number;
  modifiedAt: string;
}

export interface AlbumMeta {
  title?: string;
  artist?: string;
  year?: string;
  genre?: string;
  coverFile?: string;
  source?: string;
  fetchedAt?: string;
}

export interface LocalFolder {
  /** Display name (usually the album folder name). */
  name: string;
  /** Relative folder path from downloads root (backslash-separated). */
  relativePath: string;
  /** Parent folder name when nested (often the artist). */
  artist: string | null;
  files: LocalFile[];
  totalSize: number;
  cover: string | null;
  /** Newest file mtime in the album — used for "Recents". */
  addedAt: string;
  meta: AlbumMeta | null;
}

const AUDIO_EXT = /\.(mp3|flac|ogg|opus|m4a|aac|wav)$/i;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;
const COVER_HINT = /(cover|front|folder|album|apollo-cover)/i;
export const META_FILE = "apollo-meta.json";
export const COVER_FILE = "apollo-cover.jpg";
const MAX_DEPTH = 8;

function toRel(...parts: string[]): string {
  return parts.filter(Boolean).join("\\");
}

function pickCover(
  files: { name: string; relativePath: string }[],
  meta: AlbumMeta | null
): string | null {
  if (meta?.coverFile) {
    const hit = files.find((f) => f.name === meta.coverFile);
    if (hit) return hit.relativePath;
  }
  const images = files.filter((f) => IMAGE_EXT.test(f.name));
  if (images.length === 0) return null;
  const hinted = images.find((f) => COVER_HINT.test(f.name));
  return (hinted ?? images[0]).relativePath;
}

async function readMeta(folderAbs: string): Promise<AlbumMeta | null> {
  try {
    const raw = await fs.readFile(path.join(folderAbs, META_FILE), "utf8");
    return JSON.parse(raw) as AlbumMeta;
  } catch {
    return null;
  }
}

async function listDirectFiles(
  folderAbs: string,
  relParts: string[]
): Promise<LocalFile[]> {
  const entries = await fs.readdir(folderAbs, { withFileTypes: true }).catch(() => []);
  const files: LocalFile[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name === META_FILE) continue;
    const abs = path.join(folderAbs, entry.name);
    const stat = await fs.stat(abs).catch(() => null);
    if (!stat) continue;
    files.push({
      name: entry.name,
      relativePath: toRel(...relParts, entry.name),
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    });
  }
  files.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );
  return files;
}

/**
 * Recursively find album folders: any directory that directly contains
 * at least one audio file. Empty parents (e.g. Artist/) are skipped;
 * Artist/Album/ with tracks is included.
 */
async function walkAlbums(
  absDir: string,
  relParts: string[],
  depth: number,
  out: LocalFolder[]
): Promise<void> {
  if (depth > MAX_DEPTH || relParts.length === 0) return;

  const entries = await fs.readdir(absDir, { withFileTypes: true }).catch(() => []);
  const files = await listDirectFiles(absDir, relParts);
  const hasAudio = files.some((f) => AUDIO_EXT.test(f.name));

  if (hasAudio) {
    const meta = await readMeta(absDir);
    const newest = files.reduce(
      (max, f) => (f.modifiedAt > max ? f.modifiedAt : max),
      files[0]?.modifiedAt ?? new Date(0).toISOString()
    );
    const albumName = relParts[relParts.length - 1]!;
    const artist =
      meta?.artist ??
      (relParts.length >= 2 ? relParts[relParts.length - 2]! : null);

    out.push({
      name: meta?.title ?? albumName,
      relativePath: toRel(...relParts),
      artist,
      files,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      cover: pickCover(files, meta),
      addedAt: newest,
      meta,
    });
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    await walkAlbums(
      path.join(absDir, entry.name),
      [...relParts, entry.name],
      depth + 1,
      out
    );
  }
}

export async function scanDownloadsLibrary(downloadsDir: string): Promise<{
  folders: LocalFolder[];
  rootFiles: LocalFile[];
}> {
  const rootEntries = await fs
    .readdir(downloadsDir, { withFileTypes: true })
    .catch(() => []);

  const rootFiles: LocalFile[] = [];
  const folders: LocalFolder[] = [];

  for (const entry of rootEntries) {
    if (entry.isFile()) {
      const abs = path.join(downloadsDir, entry.name);
      const stat = await fs.stat(abs).catch(() => null);
      if (!stat) continue;
      rootFiles.push({
        name: entry.name,
        relativePath: entry.name,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      });
      continue;
    }
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    await walkAlbums(
      path.join(downloadsDir, entry.name),
      [entry.name],
      1,
      folders
    );
  }

  rootFiles.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  folders.sort((a, b) => b.addedAt.localeCompare(a.addedAt));

  return { folders, rootFiles };
}

/** Resolve a relative (backslash/slash) path under downloadsDir safely. */
export function resolveUnderDownloads(
  downloadsDir: string,
  relativePath: string
): string | null {
  const normalized = relativePath.replace(/[\\/]+/g, path.sep);
  const root = path.resolve(downloadsDir);
  const candidate = path.resolve(path.join(downloadsDir, normalized));
  if (candidate !== root && !candidate.startsWith(root + path.sep)) return null;
  return candidate;
}

export { AUDIO_EXT };
