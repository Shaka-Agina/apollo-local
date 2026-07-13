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

/** Grid / index payload — no full file list (keeps Listen fast). */
export interface LocalFolderSummary {
  name: string;
  relativePath: string;
  artist: string | null;
  totalSize: number;
  cover: string | null;
  addedAt: string;
  trackCount: number;
  meta: AlbumMeta | null;
}

export interface LocalFolder extends LocalFolderSummary {
  files: LocalFile[];
}

const AUDIO_EXT = /\.(mp3|flac|ogg|opus|m4a|aac|wav)$/i;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;
const COVER_HINT = /(cover|front|folder|album|apollo-cover)/i;
export const META_FILE = "apollo-meta.json";
export const COVER_FILE = "apollo-cover.jpg";
const INDEX_CACHE_FILE = ".apollo-index.json";
const MAX_DEPTH = 8;

type IndexPayload = {
  folders: LocalFolderSummary[];
  rootFiles: LocalFile[];
};

type CacheEntry = {
  scannedAt: number;
  folders: LocalFolderSummary[];
  rootFiles: LocalFile[];
};

const scanCache = new Map<string, CacheEntry>();
const refreshInFlight = new Map<string, Promise<CacheEntry>>();
/** Hot path: serve from RAM for this long after a scan. */
const MEMORY_TTL_MS = 120_000;
/**
 * After this, still serve disk/memory immediately (stale-while-revalidate)
 * and refresh in the background so page opens stay fast on phones.
 */
const STALE_MAX_MS = 24 * 60 * 60_000;

function toRel(...parts: string[]): string {
  return parts.filter(Boolean).join("\\");
}

function pickCover(
  fileNames: string[],
  relParts: string[],
  meta: AlbumMeta | null
): string | null {
  if (meta?.coverFile && fileNames.includes(meta.coverFile)) {
    return toRel(...relParts, meta.coverFile);
  }
  const images = fileNames.filter((n) => IMAGE_EXT.test(n));
  if (images.length === 0) return null;
  const hinted = images.find((n) => COVER_HINT.test(n));
  const name = hinted ?? images[0]!;
  return toRel(...relParts, name);
}

async function readMeta(folderAbs: string): Promise<AlbumMeta | null> {
  try {
    const raw = await fs.readFile(path.join(folderAbs, META_FILE), "utf8");
    return JSON.parse(raw) as AlbumMeta;
  } catch {
    return null;
  }
}

/** Cheap listing: names only (no per-file stat) — for walk/index. */
async function listNames(folderAbs: string): Promise<{
  fileNames: string[];
  dirs: string[];
}> {
  const entries = await fs.readdir(folderAbs, { withFileTypes: true }).catch(() => []);
  const fileNames: string[] = [];
  const dirs: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".")) dirs.push(entry.name);
      continue;
    }
    if (entry.isFile() && entry.name !== META_FILE && entry.name !== INDEX_CACHE_FILE) {
      fileNames.push(entry.name);
    }
  }
  dirs.sort((a, b) => a.localeCompare(b));
  return { fileNames, dirs };
}

async function listDirectEntries(folderAbs: string): Promise<{
  files: { name: string; size: number; modifiedAt: string }[];
  dirs: string[];
}> {
  const entries = await fs.readdir(folderAbs, { withFileTypes: true }).catch(() => []);
  const files: { name: string; size: number; modifiedAt: string }[] = [];
  const dirs: string[] = [];

  await Promise.all(
    entries.map(async (entry) => {
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".")) dirs.push(entry.name);
        return;
      }
      if (
        !entry.isFile() ||
        entry.name === META_FILE ||
        entry.name === INDEX_CACHE_FILE
      ) {
        return;
      }
      const abs = path.join(folderAbs, entry.name);
      const stat = await fs.stat(abs).catch(() => null);
      if (!stat) return;
      files.push({
        name: entry.name,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      });
    })
  );

  files.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );
  dirs.sort((a, b) => a.localeCompare(b));
  return { files, dirs };
}

/**
 * Find album folders (dirs that directly contain audio).
 * Leaf albums: once audio is found, do not recurse (big speed win on large libraries).
 * Index path avoids statting every non-audio file.
 */
async function walkAlbums(
  absDir: string,
  relParts: string[],
  depth: number,
  out: LocalFolderSummary[]
): Promise<void> {
  if (depth > MAX_DEPTH || relParts.length === 0) return;

  const { fileNames, dirs } = await listNames(absDir);
  const audioNames = fileNames.filter((n) => AUDIO_EXT.test(n));

  if (audioNames.length > 0) {
    const meta = await readMeta(absDir);
    const folderStat = await fs.stat(absDir).catch(() => null);
    const folderMtime =
      folderStat?.mtime.toISOString() ?? new Date(0).toISOString();

    // Stat audio only (covers stay name-based).
    let totalSize = 0;
    let newest = folderMtime;
    await Promise.all(
      audioNames.map(async (name) => {
        const st = await fs.stat(path.join(absDir, name)).catch(() => null);
        if (!st) return;
        totalSize += st.size;
        const iso = st.mtime.toISOString();
        if (iso > newest) newest = iso;
      })
    );

    const albumName = relParts[relParts.length - 1]!;
    const artist =
      meta?.artist ??
      (relParts.length >= 2 ? relParts[relParts.length - 2]! : null);

    out.push({
      name: meta?.title ?? albumName,
      relativePath: toRel(...relParts),
      artist,
      totalSize,
      cover: pickCover(fileNames, relParts, meta),
      addedAt: newest,
      trackCount: audioNames.length,
      meta,
    });
    return;
  }

  const batch = 12;
  for (let i = 0; i < dirs.length; i += batch) {
    const slice = dirs.slice(i, i + batch);
    await Promise.all(
      slice.map((name) =>
        walkAlbums(
          path.join(absDir, name),
          [...relParts, name],
          depth + 1,
          out
        )
      )
    );
  }
}

function diskCachePath(downloadsDir: string): string {
  return path.join(downloadsDir, INDEX_CACHE_FILE);
}

async function readDiskCache(
  downloadsDir: string
): Promise<CacheEntry | null> {
  try {
    const raw = await fs.readFile(diskCachePath(downloadsDir), "utf8");
    const parsed = JSON.parse(raw) as {
      scannedAt?: number;
      folders?: LocalFolderSummary[];
      rootFiles?: LocalFile[];
    };
    if (
      typeof parsed.scannedAt !== "number" ||
      !Array.isArray(parsed.folders) ||
      !Array.isArray(parsed.rootFiles)
    ) {
      return null;
    }
    return {
      scannedAt: parsed.scannedAt,
      folders: parsed.folders,
      rootFiles: parsed.rootFiles,
    };
  } catch {
    return null;
  }
}

async function writeDiskCache(
  downloadsDir: string,
  entry: CacheEntry
): Promise<void> {
  const payload: IndexPayload & { scannedAt: number } = {
    scannedAt: entry.scannedAt,
    folders: entry.folders,
    rootFiles: entry.rootFiles,
  };
  await fs
    .writeFile(diskCachePath(downloadsDir), JSON.stringify(payload), "utf8")
    .catch(() => null);
}

export function invalidateLibraryCache(downloadsDir?: string) {
  if (downloadsDir) {
    const key = path.resolve(downloadsDir);
    scanCache.delete(key);
    refreshInFlight.delete(key);
    void fs.unlink(diskCachePath(downloadsDir)).catch(() => null);
  } else {
    scanCache.clear();
    refreshInFlight.clear();
  }
}

async function walkLibraryIndex(downloadsDir: string): Promise<CacheEntry> {
  const rootEntries = await fs
    .readdir(downloadsDir, { withFileTypes: true })
    .catch(() => []);

  const rootFiles: LocalFile[] = [];
  const folders: LocalFolderSummary[] = [];
  const topDirs: string[] = [];

  await Promise.all(
    rootEntries.map(async (entry) => {
      if (entry.isFile()) {
        if (
          entry.name === META_FILE ||
          entry.name === INDEX_CACHE_FILE ||
          entry.name.startsWith(".")
        ) {
          return;
        }
        const abs = path.join(downloadsDir, entry.name);
        const stat = await fs.stat(abs).catch(() => null);
        if (!stat) return;
        rootFiles.push({
          name: entry.name,
          relativePath: entry.name,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        });
        return;
      }
      if (!entry.isDirectory() || entry.name.startsWith(".")) return;
      topDirs.push(entry.name);
    })
  );

  const batch = 8;
  for (let i = 0; i < topDirs.length; i += batch) {
    const slice = topDirs.slice(i, i + batch);
    await Promise.all(
      slice.map((name) =>
        walkAlbums(path.join(downloadsDir, name), [name], 1, folders)
      )
    );
  }

  rootFiles.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  folders.sort((a, b) => b.addedAt.localeCompare(a.addedAt));

  return {
    scannedAt: Date.now(),
    folders,
    rootFiles,
  };
}

function scheduleBackgroundRefresh(downloadsDir: string, key: string) {
  if (refreshInFlight.has(key)) return;
  const job = walkLibraryIndex(downloadsDir)
    .then(async (entry) => {
      scanCache.set(key, entry);
      await writeDiskCache(downloadsDir, entry);
      return entry;
    })
    .finally(() => {
      refreshInFlight.delete(key);
    });
  refreshInFlight.set(key, job);
}

/**
 * Fast library index for Listen/Library.
 * Server-side stale-while-revalidate: return the last known index immediately
 * (RAM or `.apollo-index.json`), then refresh in the background when stale.
 * Survives the user closing the browser tab — the cache lives on the server/NAS.
 */
export async function scanDownloadsLibrary(
  downloadsDir: string,
  opts?: { bypassCache?: boolean }
): Promise<{
  folders: LocalFolderSummary[];
  rootFiles: LocalFile[];
}> {
  const key = path.resolve(downloadsDir);
  const now = Date.now();

  if (!opts?.bypassCache) {
    let cached = scanCache.get(key) ?? null;
    if (!cached) {
      cached = await readDiskCache(downloadsDir);
      if (cached) scanCache.set(key, cached);
    }

    if (cached && now - cached.scannedAt < STALE_MAX_MS) {
      const age = now - cached.scannedAt;
      // Keep responses instant; refresh in the background when past hot TTL.
      if (age >= MEMORY_TTL_MS) {
        scheduleBackgroundRefresh(downloadsDir, key);
      }
      return { folders: cached.folders, rootFiles: cached.rootFiles };
    }
  }

  const inFlight = refreshInFlight.get(key);
  if (inFlight && !opts?.bypassCache) {
    const entry = await inFlight;
    return { folders: entry.folders, rootFiles: entry.rootFiles };
  }

  const entry = await walkLibraryIndex(downloadsDir);
  scanCache.set(key, entry);
  void writeDiskCache(downloadsDir, entry);
  return { folders: entry.folders, rootFiles: entry.rootFiles };
}

/** Full album (with files) for detail view. */
export async function loadAlbumFolder(
  downloadsDir: string,
  relativePath: string
): Promise<LocalFolder | null> {
  const folderAbs = resolveUnderDownloads(downloadsDir, relativePath);
  if (!folderAbs) return null;
  const st = await fs.stat(folderAbs).catch(() => null);
  if (!st?.isDirectory()) return null;

  const relParts = relativePath.split(/[\\/]/).filter(Boolean);
  const { files: raw } = await listDirectEntries(folderAbs);
  const meta = await readMeta(folderAbs);
  const files: LocalFile[] = raw.map((f) => ({
    name: f.name,
    relativePath: toRel(...relParts, f.name),
    size: f.size,
    modifiedAt: f.modifiedAt,
  }));
  const audio = files.filter((f) => AUDIO_EXT.test(f.name));
  if (audio.length === 0) return null;

  const newest = files.reduce(
    (max, f) => (f.modifiedAt > max ? f.modifiedAt : max),
    files[0]?.modifiedAt ?? new Date(0).toISOString()
  );
  const albumName = relParts[relParts.length - 1]!;
  const artist =
    meta?.artist ??
    (relParts.length >= 2 ? relParts[relParts.length - 2]! : null);

  return {
    name: meta?.title ?? albumName,
    relativePath: toRel(...relParts),
    artist,
    files,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
    cover: pickCover(
      files.map((f) => f.name),
      relParts,
      meta
    ),
    addedAt: newest,
    trackCount: audio.length,
    meta,
  };
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
