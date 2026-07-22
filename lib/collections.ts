import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  CollectionsStore,
  LikedTrack,
  Playlist,
  PlaylistTrack,
  RecentlyPlayedTrack,
  TrackRef,
} from "./collections-types";

export type {
  CollectionsStore,
  LikedTrack,
  Playlist,
  PlaylistTrack,
  RecentlyPlayedTrack,
  TrackRef,
} from "./collections-types";

const STORE_FILE = ".apollo-collections.json";
const MAX_RECENTLY_PLAYED = 100;

function storePath(): string {
  return path.join(
    process.env.APOLLO_DATA_DIR || process.cwd(),
    STORE_FILE
  );
}

function emptyStore(): CollectionsStore {
  return { version: 1, likes: [], playlists: [], recentlyPlayed: [] };
}

export async function readCollections(): Promise<CollectionsStore> {
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<CollectionsStore>;
    return {
      version: 1,
      likes: Array.isArray(parsed.likes) ? parsed.likes : [],
      playlists: Array.isArray(parsed.playlists) ? parsed.playlists : [],
      recentlyPlayed: Array.isArray(parsed.recentlyPlayed)
        ? parsed.recentlyPlayed
        : [],
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
    sizeBytes: track.sizeBytes,
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
      sizeBytes: track.sizeBytes,
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

export async function getPlaylist(id: string): Promise<Playlist | null> {
  const store = await readCollections();
  return store.playlists.find((p) => p.id === id) ?? null;
}

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

export async function updatePlaylist(
  id: string,
  patch: { name?: string; description?: string | null }
): Promise<Playlist | null> {
  const store = await readCollections();
  const playlist = store.playlists.find((p) => p.id === id);
  if (!playlist) return null;
  if (patch.name != null) playlist.name = patch.name.trim() || playlist.name;
  if (patch.description !== undefined) {
    playlist.description =
      patch.description === null || patch.description === ""
        ? undefined
        : patch.description.trim();
  }
  playlist.updatedAt = new Date().toISOString();
  await writeCollections(store);
  return playlist;
}

export async function deletePlaylist(id: string): Promise<boolean> {
  const store = await readCollections();
  const idx = store.playlists.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  store.playlists.splice(idx, 1);
  await writeCollections(store);
  return true;
}

export async function addTrackToPlaylist(
  id: string,
  track: TrackRef
): Promise<Playlist | null> {
  const store = await readCollections();
  const playlist = store.playlists.find((p) => p.id === id);
  if (!playlist) return null;
  if (playlist.tracks.some((t) => t.file === track.file)) {
    return playlist;
  }
  const entry: PlaylistTrack = {
    file: track.file,
    title: track.title,
    artist: track.artist,
    artwork: track.artwork,
    sizeBytes: track.sizeBytes,
    addedAt: new Date().toISOString(),
  };
  playlist.tracks.push(entry);
  playlist.updatedAt = new Date().toISOString();
  await writeCollections(store);
  return playlist;
}

export async function removeTrackFromPlaylist(
  id: string,
  file: string
): Promise<Playlist | null> {
  const store = await readCollections();
  const playlist = store.playlists.find((p) => p.id === id);
  if (!playlist) return null;
  const before = playlist.tracks.length;
  playlist.tracks = playlist.tracks.filter((t) => t.file !== file);
  if (playlist.tracks.length === before) return playlist;
  playlist.updatedAt = new Date().toISOString();
  await writeCollections(store);
  return playlist;
}

/** Reorder tracks by providing the full ordered list of file paths. */
export async function reorderPlaylistTracks(
  id: string,
  orderedFiles: string[]
): Promise<Playlist | null> {
  const store = await readCollections();
  const playlist = store.playlists.find((p) => p.id === id);
  if (!playlist) return null;
  const byFile = new Map(playlist.tracks.map((t) => [t.file, t]));
  const next: PlaylistTrack[] = [];
  for (const file of orderedFiles) {
    const t = byFile.get(file);
    if (t) {
      next.push(t);
      byFile.delete(file);
    }
  }
  // Keep any tracks not listed (shouldn't happen) at the end.
  for (const t of byFile.values()) next.push(t);
  playlist.tracks = next;
  playlist.updatedAt = new Date().toISOString();
  await writeCollections(store);
  return playlist;
}

export async function listRecentlyPlayed(): Promise<RecentlyPlayedTrack[]> {
  const store = await readCollections();
  return [...(store.recentlyPlayed ?? [])].sort((a, b) =>
    b.playedAt.localeCompare(a.playedAt)
  );
}

export async function recordPlay(
  track: TrackRef
): Promise<RecentlyPlayedTrack[]> {
  const store = await readCollections();
  const list = store.recentlyPlayed ?? [];
  const filtered = list.filter((t) => t.file !== track.file);
  filtered.unshift({
    file: track.file,
    title: track.title,
    artist: track.artist,
    artwork: track.artwork,
    sizeBytes: track.sizeBytes,
    playedAt: new Date().toISOString(),
  });
  store.recentlyPlayed = filtered.slice(0, MAX_RECENTLY_PLAYED);
  await writeCollections(store);
  return store.recentlyPlayed;
}
