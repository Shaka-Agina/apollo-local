"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Track } from "@/components/player/PlayerProvider";
import type { RecentlyPlayedTrack } from "@/lib/collections-types";

export function useRecentlyPlayed() {
  const qc = useQueryClient();

  useEffect(() => {
    const onPlay = (e: Event) => {
      const tracks = (e as CustomEvent).detail as RecentlyPlayedTrack[];
      if (Array.isArray(tracks)) {
        qc.setQueryData(["recently-played"], { tracks });
      }
    };
    window.addEventListener("apollo:recently-played", onPlay);
    return () => window.removeEventListener("apollo:recently-played", onPlay);
  }, [qc]);

  return useQuery<{ tracks: RecentlyPlayedTrack[] }>({
    queryKey: ["recently-played"],
    queryFn: async () => {
      const res = await fetch("/api/library/recently-played");
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to load history");
      return body;
    },
    staleTime: 15_000,
  });
}

export function useRecordPlay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (track: Track) => {
      const res = await fetch("/api/library/recently-played", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track: {
            file: track.file,
            title: track.title,
            artist: track.artist,
            artwork: track.artwork,
            sizeBytes: track.sizeBytes,
          },
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to record play");
      return body as { tracks: RecentlyPlayedTrack[] };
    },
    onSuccess: (data) => {
      qc.setQueryData(["recently-played"], { tracks: data.tracks });
    },
  });
}
