"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Share } from "@/lib/types";
import { FileTree } from "@/components/library/FileTree";
import { DownloadsBrowser } from "@/components/library/DownloadsBrowser";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

type Tab = "downloaded" | "shared";

function SharedTab() {
  const shares = useQuery<Share[]>({
    queryKey: ["shares"],
    queryFn: async () => {
      const res = await fetch("/api/shares");
      if (!res.ok) throw new Error("Failed to load shares");
      return res.json();
    },
    staleTime: 60_000,
  });

  if (shares.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (shares.error) {
    return (
      <EmptyState
        title="Cannot reach slskd"
        hint="Check that slskd is running and SLSKD_URL is correct."
      />
    );
  }

  if ((shares.data ?? []).length === 0) {
    return (
      <EmptyState
        title="No shares"
        hint="Sharing may be turned off — check Settings."
      />
    );
  }

  return <FileTree shares={shares.data!} />;
}

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>("downloaded");

  return (
    <div className="space-y-4">
      <h1 className="font-mono text-lg font-bold uppercase tracking-[0.2em] text-primary">
        Library
      </h1>

      <div className="flex overflow-hidden rounded-lg border border-edge">
        {(
          [
            { value: "downloaded", label: "Downloaded" },
            { value: "shared", label: "Shared" },
          ] as const
        ).map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "h-10 flex-1 font-mono text-[11px] uppercase tracking-widest transition-colors",
              tab === t.value
                ? "bg-hover text-primary"
                : "text-muted hover:text-secondary"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "downloaded" ? <DownloadsBrowser /> : <SharedTab />}
    </div>
  );
}
