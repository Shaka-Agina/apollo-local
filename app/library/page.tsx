"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Share } from "@/lib/types";
import { FileTree } from "@/components/library/FileTree";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, formatBytes } from "@/lib/utils";
import {
  AlbumGridCard,
  StickyLibraryChrome,
  type LibraryFilter,
  type LibrarySort,
} from "@/components/library/LibraryChrome";
import {
  isPlayable,
  useDownloadsListing,
  type LocalFolder,
} from "@/hooks/useDownloads";
import { usePlayer, type Track } from "@/components/player/PlayerProvider";
import { AddToQueueButton } from "@/components/player/QueuePanel";
import { audioUrl } from "@/hooks/useDownloads";

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

function tracksOf(folder: LocalFolder): Track[] {
  return folder.files.filter((f) => isPlayable(f.name)).map((f) => ({
    file: f.relativePath,
    title: f.name.replace(/\.[^.]+$/, ""),
    artist: folder.artist ?? folder.meta?.artist ?? folder.name,
    artwork: folder.cover ? audioUrl(folder.cover) : undefined,
  }));
}

function DownloadedTab() {
  const listing = useDownloadsListing();
  const player = usePlayer();
  const [filter, setFilter] = useState<LibraryFilter>("albums");
  const [sort, setSort] = useState<LibrarySort>("recent");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const folders = useMemo(() => {
    if (!listing.data) return [];
    const q = search.trim().toLowerCase();
    let list = listing.data.folders;
    if (q) {
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.artist ?? "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) =>
      sort === "recent"
        ? b.addedAt.localeCompare(a.addedAt)
        : a.name.localeCompare(b.name)
    );
  }, [listing.data, search, sort]);

  const singles = useMemo(() => {
    if (!listing.data) return [];
    const q = search.trim().toLowerCase();
    let list = listing.data.rootFiles.filter((f) => isPlayable(f.name));
    if (q) list = list.filter((f) => f.name.toLowerCase().includes(q));
    return [...list].sort((a, b) =>
      sort === "recent"
        ? b.modifiedAt.localeCompare(a.modifiedAt)
        : a.name.localeCompare(b.name)
    );
  }, [listing.data, search, sort]);

  if (listing.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (listing.error) {
    return (
      <EmptyState title="Cannot read downloads" hint={listing.error.message} />
    );
  }

  const showAlbums = filter === "albums" || filter === "all";
  const showSingles = filter === "singles" || filter === "all";

  return (
    <div className="space-y-1">
      <StickyLibraryChrome
        filter={filter}
        onFilter={setFilter}
        sort={sort}
        onSort={setSort}
        search={search}
        onSearch={setSearch}
        showSearch={showSearch}
        onToggleSearch={() => setShowSearch((v) => !v)}
      />

      {showAlbums && folders.length === 0 && showSingles && singles.length === 0 && (
        <EmptyState
          title={search ? "No matches" : "No downloads yet"}
          hint="Queued downloads appear here when they finish."
        />
      )}

      {showAlbums && folders.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {folders.map((folder) => {
            const tracks = tracksOf(folder);
            return (
              <AlbumGridCard
                key={folder.relativePath}
                title={folder.name}
                subtitle={
                  folder.artist
                    ? `Album · ${folder.artist}`
                    : `${tracks.length} tracks`
                }
                cover={folder.cover}
                onClick={() => {
                  if (tracks[0]) player.play(tracks[0], tracks);
                }}
              />
            );
          })}
        </div>
      )}

      {showSingles && singles.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-lg border border-edge bg-surface">
          {singles.map((file, i) => {
            const track = {
              file: file.relativePath,
              title: file.name.replace(/\.[^.]+$/, ""),
            };
            return (
              <div
                key={file.relativePath}
                className={cn(
                  "flex min-h-[48px] w-full items-center gap-1 px-2 py-2 hover:bg-hover",
                  i > 0 && "border-t border-edge"
                )}
              >
                <button
                  onClick={() =>
                    player.play(
                      track,
                      singles.map((f) => ({
                        file: f.relativePath,
                        title: f.name.replace(/\.[^.]+$/, ""),
                      }))
                    )
                  }
                  className="flex min-w-0 flex-1 items-center gap-3 px-1 text-left"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-secondary">
                    {file.name}
                  </span>
                  <span className="font-mono text-[11px] text-muted">
                    {formatBytes(file.size)}
                  </span>
                </button>
                <AddToQueueButton track={track} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>("downloaded");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-primary">Library</h1>

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

      {tab === "downloaded" ? <DownloadedTab /> : <SharedTab />}
    </div>
  );
}
