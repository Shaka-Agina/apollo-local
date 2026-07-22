"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fileExtension } from "@/lib/utils";

export interface LocalFile {
  name: string;
  relativePath: string;
  size: number;
  modifiedAt: string;
  title?: string;
  artist?: string;
  album?: string;
  trackNumber?: number;
  duration?: number;
  bitrate?: number;
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

export interface DownloadsListing {
  downloadsDir: string;
  folders: LocalFolderSummary[];
  rootFiles: LocalFile[];
}

const PLAYABLE = new Set(["mp3", "flac", "ogg", "opus", "m4a", "aac", "wav"]);

export function isPlayable(filename: string): boolean {
  return PLAYABLE.has(fileExtension(filename));
}

export function audioUrl(relativePath: string): string {
  return `/api/audio?file=${encodeURIComponent(relativePath)}`;
}

export function useDownloadsListing() {
  return useQuery<DownloadsListing>({
    queryKey: ["downloads-listing"],
    queryFn: async () => {
      const res = await fetch("/api/library/downloads");
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to load downloads");
      return body;
    },
    // Server holds the durable index; keep client requests light.
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useAlbumDetail(relativePath: string | null) {
  return useQuery<{ folder: LocalFolder }>({
    queryKey: ["album-detail", relativePath],
    enabled: !!relativePath,
    queryFn: async () => {
      const res = await fetch(
        `/api/library/downloads?album=${encodeURIComponent(relativePath!)}`
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to load album");
      return body;
    },
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
  });
}

export function useFetchAlbumMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      folderRelativePath: string;
      query?: string;
    }) => {
      const res = await fetch("/api/library/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to fetch metadata");
      return body as {
        ok: boolean;
        meta: AlbumMeta;
        coverRelativePath: string | null;
      };
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["downloads-listing"] });
      void qc.invalidateQueries({
        queryKey: ["album-detail", vars.folderRelativePath],
      });
    },
  });
}
