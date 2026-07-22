"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Track } from "@/components/player/PlayerProvider";
import type { Playlist } from "@/lib/collections-types";

export function usePlaylists() {
  return useQuery<{ playlists: Playlist[] }>({
    queryKey: ["playlists"],
    queryFn: async () => {
      const res = await fetch("/api/library/playlists");
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to load playlists");
      return body;
    },
    staleTime: 30_000,
  });
}

export function usePlaylist(id: string | null) {
  return useQuery<{ playlist: Playlist }>({
    queryKey: ["playlist", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/library/playlists/${id}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to load playlist");
      return body;
    },
  });
}

function trackBody(track: Track) {
  return {
    file: track.file,
    title: track.title,
    artist: track.artist,
    artwork: track.artwork,
    sizeBytes: track.sizeBytes,
  };
}

export function useCreatePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const res = await fetch("/api/library/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to create playlist");
      return body as { playlist: Playlist };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
}

export function useUpdatePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      description?: string | null;
    }) => {
      const res = await fetch(`/api/library/playlists/${input.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          description: input.description,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to update playlist");
      return body as { playlist: Playlist };
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["playlists"] });
      qc.setQueryData(["playlist", data.playlist.id], data);
    },
  });
}

export function useDeletePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/library/playlists/${id}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to delete playlist");
      return body;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
}

export function useAddToPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { playlistId: string; track: Track }) => {
      const res = await fetch(`/api/library/playlists/${input.playlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addTrack: trackBody(input.track) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to add track");
      return body as { playlist: Playlist };
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["playlists"] });
      qc.setQueryData(["playlist", data.playlist.id], data);
    },
  });
}

export function useRemoveFromPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { playlistId: string; file: string }) => {
      const res = await fetch(`/api/library/playlists/${input.playlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeFile: input.file }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to remove track");
      return body as { playlist: Playlist };
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["playlists"] });
      qc.setQueryData(["playlist", data.playlist.id], data);
    },
  });
}

export function useReorderPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { playlistId: string; orderedFiles: string[] }) => {
      const res = await fetch(`/api/library/playlists/${input.playlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorder: input.orderedFiles }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to reorder");
      return body as { playlist: Playlist };
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["playlists"] });
      qc.setQueryData(["playlist", data.playlist.id], data);
    },
  });
}
