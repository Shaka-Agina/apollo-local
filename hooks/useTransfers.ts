"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Transfer, TransferUserGroup } from "@/lib/types";
import { bucketForState } from "@/lib/types";

async function jsonOrThrow(res: Response) {
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body;
}

/** Flattened transfer with its owner attached. */
export interface FlatTransfer extends Transfer {
  username: string;
}

export function flattenTransfers(groups: TransferUserGroup[]): FlatTransfer[] {
  return groups.flatMap((group) =>
    (group.directories ?? []).flatMap((dir) =>
      (dir.files ?? []).map((file) => ({ ...file, username: group.username }))
    )
  );
}

export function useTransfers() {
  return useQuery<TransferUserGroup[], Error, FlatTransfer[]>({
    queryKey: ["transfers"],
    queryFn: async () => {
      const res = await fetch("/api/transfers");
      return jsonOrThrow(res);
    },
    select: flattenTransfers,
    refetchInterval: 2000,
  });
}

/** Number of transfers currently queued or downloading — used for nav badges. */
export function useActiveDownloadCount() {
  return useQuery<TransferUserGroup[], Error, number>({
    queryKey: ["transfers"],
    queryFn: async () => {
      const res = await fetch("/api/transfers");
      return jsonOrThrow(res);
    },
    select: (groups) =>
      flattenTransfers(groups).filter((t) =>
        ["inProgress", "queued", "initializing"].includes(
          bucketForState(t.state)
        )
      ).length,
    refetchInterval: 4000,
  });
}

export function useEnqueueDownloads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      username: string;
      files: { filename: string; size: number }[];
      folderName?: string;
    }) => {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return jsonOrThrow(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
  });
}

export function useCancelTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      username: string;
      remove?: boolean;
    }) => {
      const params = new URLSearchParams({
        username: input.username,
        remove: String(input.remove ?? false),
      });
      const res = await fetch(
        `/api/transfers/${encodeURIComponent(input.id)}?${params}`,
        { method: "DELETE" }
      );
      return jsonOrThrow(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
  });
}

export function useRetryTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      username: string;
      filename: string;
      size: number;
    }) => {
      const res = await fetch(`/api/transfers/${encodeURIComponent(input.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: input.username,
          filename: input.filename,
          size: input.size,
        }),
      });
      return jsonOrThrow(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
  });
}
