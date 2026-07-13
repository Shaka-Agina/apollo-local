import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  CollectionsStore,
  LikedTrack,
  Playlist,
  TrackRef,
} from "./collections-types";

export type {
  CollectionsStore,
  LikedTrack,
  Playlist,
  PlaylistTrack,
  TrackRef,
} from "./collections-types";

const STORE_FILE = ".apollo-collections.json";

function storePath(): string {
  return path.join(
    process.env.APOLLO_DATA_DIR || process.cwd(),
    STORE_FILE
  );
}

function emptyStore(): CollectionsStore {
  return { version: 1, likes: [], playlists: [] };
}

export async function readCollections(): Promise<CollectionsStore> {
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<CollectionsStore>;
    return {
      version: 1,
      likes: Array.isArray(parsed.likes) ? parsed.likes : [],
      playlists: Array.isArray(parsed.playlists) ? parsed.playlists : [],
    };
  } catch {
    return emptyStore();
  }
}

export async function writeCollections(
  store: CollectionsStore
): Promise<void> {
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(store, null, 2), "utf8");
}

/** Likes newest-first. */
export function sortLikes(likes: LikedTrack[]): LikedTrack[] {
  return [...likes].sort((a, b) => b.likedAt.localeCompare(a.likedAt));
}

export async function listLikes(): Promise<LikedTrack[]> {
  const store = await readCollections();
  return sortLikes(store.likes);
}

export async function toggleLike(
  track: TrackRef
): Promise<{ liked: boolean; likes: LikedTrack[] }> {
  const store = await readCollections();
  const idx = store.likes.findIndex((t) => t.file === track.file);
  if (idx >= 0) {
    store.likes.splice(idx, 1);
    await writeCollections(store);
    return { liked: false, likes: sortLikes(store.likes) };
  }
  store.likes.push({
    file: track.file,
    title: track.title,
    artist: track.artist,
    artwork: track.artwork,
    likedAt: new Date().toISOString(),
  });
  await writeCollections(store);
  return { liked: true, likes: sortLikes(store.likes) };
}

export async function setLiked(
  track: TrackRef,
  liked: boolean
): Promise<LikedTrack[]> {
  const store = await readCollections();
  const idx = store.likes.findIndex((t) => t.file === track.file);
  if (liked) {
    const entry: LikedTrack = {
      file: track.file,
      title: track.title,
      artist: track.artist,
      artwork: track.artwork,
      likedAt: new Date().toISOString(),
    };
    if (idx >= 0) store.likes[idx] = entry;
    else store.likes.push(entry);
  } else if (idx >= 0) {
    store.likes.splice(idx, 1);
  }
  await writeCollections(store);
  return sortLikes(store.likes);
}

export async function listPlaylists(): Promise<Playlist[]> {
  const store = await readCollections();
  return [...store.playlists].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

/** Scaffold for upcoming playlist UI. */
export async function createPlaylist(input: {
  name: string;
  description?: string;
}): Promise<Playlist> {
  const store = await readCollections();
  const now = new Date().toISOString();
  const playlist: Playlist = {
    id: randomUUID(),
    name: input.name.trim() || "Playlist",
    description: input.description?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    tracks: [],
  };
  store.playlists.push(playlist);
  await writeCollections(store);
  return playlist;
}
