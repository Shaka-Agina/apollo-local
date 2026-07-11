"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { SearchState } from "@/lib/types";

async function jsonOrThrow(res: Response) {
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body;
}

export function useSearch() {
  const queryClient = useQueryClient();
  const [searchId, setSearchId] = useState<string | null>(null);

  const start = useMutation({
    mutationFn: async (searchText: string): Promise<SearchState> => {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchText }),
      });
      return jsonOrThrow(res);
    },
    onSuccess: (data) => {
      queryClient.removeQueries({ queryKey: ["search"] });
      setSearchId(data.id);
    },
  });

  const results = useQuery<SearchState>({
    queryKey: ["search", searchId],
    queryFn: async () => {
      const res = await fetch(`/api/search?id=${encodeURIComponent(searchId!)}`);
      return jsonOrThrow(res);
    },
    enabled: !!searchId,
    refetchInterval: (query) =>
      query.state.data?.isComplete ? false : 1500,
  });

  const reset = () => {
    setSearchId(null);
    queryClient.removeQueries({ queryKey: ["search"] });
  };

  return {
    search: (text: string) => start.mutate(text),
    isStarting: start.isPending,
    startError: start.error,
    searchId,
    results: results.data,
    isPolling: !!searchId && !results.data?.isComplete,
    reset,
  };
}
