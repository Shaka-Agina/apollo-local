"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fileExtension } from "@/lib/utils";

export interface LocalFile {
  name: string;
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
  name: string;
  relativePath: string;
  artist: string | null;
  files: LocalFile[];
  totalSize: number;
  cover: string | null;
  addedAt: string;
  meta: AlbumMeta | null;
}

export interface DownloadsListing {
  downloadsDir: string;
  folders: LocalFolder[];
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
    refetchInterval: 15_000,
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["downloads-listing"] });
    },
  });
}
