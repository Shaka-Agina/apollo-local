"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface DirectorySettings {
  downloads: string | null;
  incomplete: string | null;
  editable: boolean;
}

async function jsonOrThrow(res: Response) {
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body;
}

export function useDirectories() {
  return useQuery<DirectorySettings>({
    queryKey: ["directories"],
    queryFn: async () => {
      const res = await fetch("/api/settings/directories");
      return jsonOrThrow(res);
    },
    staleTime: 30_000,
  });
}

export function useUpdateDirectories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (update: { downloads?: string; incomplete?: string }) => {
      const res = await fetch("/api/settings/directories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      return jsonOrThrow(res);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["directories"], data);
    },
  });
}
