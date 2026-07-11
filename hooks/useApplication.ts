"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApplicationState } from "@/lib/types";

export function useApplication() {
  return useQuery<ApplicationState>({
    queryKey: ["application"],
    queryFn: async () => {
      const res = await fetch("/api/application");
      if (!res.ok) throw new Error("Failed to reach slskd");
      return res.json();
    },
    refetchInterval: 10_000,
  });
}
