/** Shared track identity for likes + playlists (safe for client + server). */

export interface TrackRef {
  file: string;
  title: string;
  artist?: string;
  artwork?: string;
}

export interface LikedTrack extends TrackRef {
  likedAt: string;
}

export interface PlaylistTrack extends TrackRef {
  addedAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  tracks: PlaylistTrack[];
}

export interface CollectionsStore {
  version: 1;
  likes: LikedTrack[];
  playlists: Playlist[];
}
