"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Share } from "@/lib/types";
import { FileTree } from "@/components/library/FileTree";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import {
  AlbumGrid,
  AlbumGridCard,
  StickyLibraryChrome,
  type LibraryFilter,
  type LibrarySort,
} from "@/components/library/LibraryChrome";
import {
  audioUrl,
  isPlayable,
  useDownloadsListing,
  type LocalFolder,
  type LocalFolderSummary,
} from "@/hooks/useDownloads";
import { usePlayer, type Track } from "@/components/player/PlayerProvider";
import { AddToQueueButton } from "@/components/player/QueuePanel";
import { LikeButton } from "@/components/player/LikeButton";
import { useLikes } from "@/hooks/useLikes";

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
    title: f.title || f.name.replace(/\.[^.]+$/, ""),
    artist: f.artist ?? folder.artist ?? folder.meta?.artist ?? folder.name,
    artwork: folder.cover ? audioUrl(folder.cover) : undefined,
    sizeBytes: f.size,
  }));
}

async function loadAlbumTracks(summary: LocalFolderSummary): Promise<Track[]> {
  const res = await fetch(
    `/api/library/downloads?album=${encodeURIComponent(summary.relativePath)}`
  );
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? "Failed to load album");
  return tracksOf(body.folder as LocalFolder);
}

function DownloadedTab() {
  const listing = useDownloadsListing();
  const likesQuery = useLikes();
  const player = usePlayer();
  const [filter, setFilter] = useState<LibraryFilter>("albums");
  const [sort, setSort] = useState<LibrarySort>("recent");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [busyPath, setBusyPath] = useState<string | null>(null);

  const folders = useMemo(() => {
    if (!listing.data) return [];
    const q = search.trim().toLowerCase();
    let list = listing.data.folders;
    if (q) {
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.artist ?? "").toLowerCase().includes(q) ||
          (f.meta?.title ?? "").toLowerCase().includes(q) ||
          (f.meta?.artist ?? "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      return b.addedAt.localeCompare(a.addedAt);
    });
  }, [listing.data, search, sort]);

  const artists = useMemo(() => {
    const map = new Map<
      string,
      { name: string; albums: LocalFolderSummary[]; cover: string | null }
    >();
    for (const folder of folders) {
      const name = (folder.artist ?? "Unknown artist").trim() || "Unknown artist";
      const key = name.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.albums.push(folder);
        if (!existing.cover && folder.cover) existing.cover = folder.cover;
      } else {
        map.set(key, { name, albums: [folder], cover: folder.cover });
      }
    }
    let list = [...map.values()];
    list.sort((a, b) => a.name.localeCompare(b.name));
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((a) => a.name.toLowerCase().includes(q));
    return list;
  }, [folders, search]);

  const likedTracks = useMemo(() => {
    const likes = likesQuery.data?.likes ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return likes;
    return likes.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.artist ?? "").toLowerCase().includes(q)
    );
  }, [likesQuery.data?.likes, search]);

  if (listing.isLoading && filter !== "liked") {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (listing.error && filter !== "liked") {
    return (
      <EmptyState title="Cannot read downloads" hint={listing.error.message} />
    );
  }

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
        filters={["albums", "artists", "liked"]}
      />

      {filter === "albums" && folders.length === 0 && (
        <EmptyState
          title={search ? "No matches" : "No downloads yet"}
          hint="Queued downloads appear here when they finish."
        />
      )}
      {filter === "artists" && artists.length === 0 && (
        <EmptyState
          title={search ? "No matches" : "No artists yet"}
          hint="Albums with artist metadata show up here."
        />
      )}
      {filter === "liked" && likedTracks.length === 0 && !likesQuery.isLoading && (
        <EmptyState
          title={search ? "No matches" : "No liked tracks yet"}
          hint="Tap the heart on a track to save it here."
        />
      )}

      {filter === "albums" && folders.length > 0 && (
        <AlbumGrid>
          {folders.map((folder) => (
            <AlbumGridCard
              key={folder.relativePath}
              title={folder.name}
              subtitle={folder.artist ?? "Unknown artist"}
              cover={folder.cover}
              onClick={async () => {
                try {
                  setBusyPath(folder.relativePath);
                  const tracks = await loadAlbumTracks(folder);
                  if (tracks[0]) player.play(tracks[0], tracks);
                } finally {
                  setBusyPath(null);
                }
              }}
            />
          ))}
        </AlbumGrid>
      )}
      {busyPath && (
        <p className="py-2 text-center font-mono text-[11px] text-muted">
          Loading album…
        </p>
      )}

      {filter === "artists" && artists.length > 0 && (
        <AlbumGrid>
          {artists.map((artist) => (
            <AlbumGridCard
              key={artist.name}
              title={artist.name}
              subtitle={`${artist.albums.length} album${artist.albums.length === 1 ? "" : "s"}`}
              cover={artist.cover}
              onClick={async () => {
                const first = artist.albums[0];
                if (!first) return;
                try {
                  setBusyPath(first.relativePath);
                  const tracks = await loadAlbumTracks(first);
                  if (tracks[0]) player.play(tracks[0], tracks);
                } finally {
                  setBusyPath(null);
                }
              }}
            />
          ))}
        </AlbumGrid>
      )}

      {filter === "liked" && likedTracks.length > 0 && (
        <div className="mt-1 overflow-hidden rounded-lg border border-edge bg-surface">
          {likedTracks.map((liked, i) => {
            const track: Track = {
              file: liked.file,
              title: liked.title,
              artist: liked.artist,
              artwork: liked.artwork,
            };
            return (
              <div
                key={liked.file}
                className={cn(
                  "flex min-h-[48px] w-full items-center gap-1 px-2 py-2 hover:bg-hover",
                  i > 0 && "border-t border-edge"
                )}
              >
                <button
                  onClick={() =>
                    player.play(
                      track,
                      likedTracks.map((t) => ({
                        file: t.file,
                        title: t.title,
                        artist: t.artist,
                        artwork: t.artwork,
                      }))
                    )
                  }
                  className="flex min-w-0 flex-1 items-center gap-3 px-1 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-secondary">
                      {liked.title}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-muted">
                      {liked.artist ?? "Unknown artist"}
                    </span>
                  </span>
                </button>
                <LikeButton track={track} />
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
