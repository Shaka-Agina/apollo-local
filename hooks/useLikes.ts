"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Track } from "@/components/player/PlayerProvider";
import type { LikedTrack } from "@/lib/collections-types";

export function useLikes() {
  return useQuery<{ likes: LikedTrack[] }>({
    queryKey: ["likes"],
    queryFn: async () => {
      const res = await fetch("/api/library/likes");
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to load likes");
      return body;
    },
    staleTime: 30_000,
  });
}

export function useIsLiked(file: string | undefined | null) {
  const likes = useLikes();
  if (!file) return false;
  return (likes.data?.likes ?? []).some((t) => t.file === file);
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (track: Track) => {
      const res = await fetch("/api/library/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track: {
            file: track.file,
            title: track.title,
            artist: track.artist,
            artwork: track.artwork,
          },
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to update like");
      return body as { liked: boolean; likes: LikedTrack[] };
    },
    onSuccess: (data) => {
      qc.setQueryData(["likes"], { likes: data.likes });
    },
  });
}
