"use client";

import { useQuery } from "@tanstack/react-query";
import { fileExtension } from "@/lib/utils";

export interface LocalFile {
  name: string;
  /** Path relative to the downloads dir — playable via /api/audio. */
  relativePath: string;
  size: number;
  modifiedAt: string;
}

export interface LocalFolder {
  name: string;
  files: LocalFile[];
  totalSize: number;
  cover: string | null;
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
