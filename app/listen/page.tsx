"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePlayer, type Track } from "@/components/player/PlayerProvider";
import { AddToQueueButton } from "@/components/player/QueuePanel";
import { LikeButton } from "@/components/player/LikeButton";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, formatBytes } from "@/lib/utils";
import {
  AlbumGrid,
  AlbumGridCard,
  Artwork,
  StickyLibraryChrome,
  type LibraryFilter,
  type LibrarySort,
} from "@/components/library/LibraryChrome";
import {
  audioUrl,
  isPlayable,
  useAlbumDetail,
  useDownloadsListing,
  useFetchAlbumMeta,
  type LocalFile,
  type LocalFolder,
  type LocalFolderSummary,
} from "@/hooks/useDownloads";
import { useLikes } from "@/hooks/useLikes";

const PAGE_SIZE = 36;

function tracksOf(folder: LocalFolder): Track[] {
  return folder.files.filter((f) => isPlayable(f.name)).map((f) => ({
    file: f.relativePath,
    title: f.name.replace(/\.[^.]+$/, ""),
    artist: folder.artist ?? folder.meta?.artist ?? folder.name,
    artwork: folder.cover ? audioUrl(folder.cover) : undefined,
  }));
}

type ArtistGroup = {
  name: string;
  albums: LocalFolderSummary[];
  cover: string | null;
};

function AlbumDetail({
  summary,
  onBack,
}: {
  summary: LocalFolderSummary;
  onBack: () => void;
}) {
  const player = usePlayer();
  const fetchMeta = useFetchAlbumMeta();
  const detail = useAlbumDetail(summary.relativePath);
  const folder = detail.data?.folder;
  const tracks = useMemo(
    () => (folder ? tracksOf(folder) : []),
    [folder]
  );
  const audioFiles = folder?.files.filter((f) => isPlayable(f.name)) ?? [];
  const artist =
    folder?.meta?.artist ?? folder?.artist ?? summary.artist;
  const displayName = folder?.name ?? summary.name;
  const cover = folder?.cover ?? summary.cover;

  const playFrom = (file: LocalFile) => {
    const track = tracks.find((t) => t.file === file.relativePath);
    if (track) player.play(track, tracks);
  };

  return (
    <div className="space-y-5 pb-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-secondary hover:text-primary"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="15,5 8,12 15,19" />
        </svg>
        Back
      </button>

      <div className="flex gap-4">
        <Artwork
          cover={cover}
          name={displayName}
          className="h-32 w-32 shrink-0 rounded-md sm:h-40 sm:w-40"
        />
        <div className="flex min-w-0 flex-col justify-end gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            Album
          </p>
          <h2 className="break-words text-xl font-bold leading-tight text-primary sm:text-2xl">
            {displayName}
          </h2>
          <p className="truncate text-sm text-secondary">
            {artist ?? "Unknown artist"}
            {(folder?.meta?.year ?? summary.meta?.year)
              ? ` · ${folder?.meta?.year ?? summary.meta?.year}`
              : ""}
          </p>
          <p className="font-mono text-[11px] text-muted">
            {folder
              ? `${audioFiles.length} tracks · ${formatBytes(folder.totalSize)}`
              : `${summary.trackCount} tracks · ${formatBytes(summary.totalSize)}`}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {tracks.length > 0 && (
              <button
                onClick={() => player.play(tracks[0]!, tracks)}
                className="flex h-9 items-center gap-2 rounded-full bg-accent px-4 font-mono text-[11px] uppercase tracking-widest text-base hover:opacity-90"
              >
                Play
              </button>
            )}
            <button
              onClick={() =>
                fetchMeta.mutate({
                  folderRelativePath: summary.relativePath,
                  query: [artist, displayName].filter(Boolean).join(" "),
                })
              }
              disabled={fetchMeta.isPending}
              className="flex h-9 items-center gap-2 rounded-full border border-edge bg-surface px-4 font-mono text-[11px] uppercase tracking-widest text-secondary hover:bg-hover hover:text-primary disabled:opacity-50"
            >
              {fetchMeta.isPending ? "Fetching…" : "Fetch cover"}
            </button>
          </div>
          {fetchMeta.isError && (
            <p className="text-xs text-destructive">
              {(fetchMeta.error as Error).message}
            </p>
          )}
          {fetchMeta.isSuccess && (
            <p className="text-xs text-secondary">Cover saved to album folder.</p>
          )}
        </div>
      </div>

      {detail.isLoading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {detail.error && (
        <EmptyState title="Cannot open album" hint={detail.error.message} />
      )}

      {folder && (
        <>
          <div className="overflow-hidden rounded-lg border border-edge bg-surface">
            {audioFiles.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted">No playable tracks.</p>
            )}
            {audioFiles.map((file, i) => {
              const isCurrent = player.track?.file === file.relativePath;
              const isPlayingThis = isCurrent && player.playing;
              const track = tracks.find((t) => t.file === file.relativePath);
              return (
                <div
                  key={file.relativePath}
                  className={cn(
                    "flex min-h-[48px] w-full items-center gap-1 px-2 py-2 hover:bg-hover",
                    i > 0 && "border-t border-edge"
                  )}
                >
                  <button
                    onClick={() => playFrom(file)}
                    className="flex min-w-0 flex-1 items-center gap-3 px-1 text-left"
                  >
                    <span className="w-6 shrink-0 text-center font-mono text-[11px] text-muted">
                      {isPlayingThis ? (
                        <span className="text-primary">▶</span>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm",
                        isCurrent ? "text-primary" : "text-secondary"
                      )}
                    >
                      {file.name.replace(/\.[^.]+$/, "")}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-muted">
                      {formatBytes(file.size)}
                    </span>
                  </button>
                  {track && <LikeButton track={track} />}
                  {track && <AddToQueueButton track={track} />}
                </div>
              );
            })}
          </div>

          <section className="space-y-2 rounded-lg border border-edge bg-surface p-4">
            <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted">
              About
            </h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Artist</dt>
              <dd className="text-secondary">{artist ?? "—"}</dd>
              <dt className="text-muted">Album</dt>
              <dd className="text-secondary">{displayName}</dd>
              <dt className="text-muted">Year</dt>
              <dd className="text-secondary">{folder.meta?.year ?? "—"}</dd>
              <dt className="text-muted">Genre</dt>
              <dd className="text-secondary">{folder.meta?.genre ?? "—"}</dd>
              <dt className="text-muted">Path</dt>
              <dd className="break-all font-mono text-[11px] text-muted">
                {folder.relativePath}
              </dd>
              <dt className="text-muted">Added</dt>
              <dd className="font-mono text-[11px] text-muted">
                {new Date(folder.addedAt).toLocaleString()}
              </dd>
            </dl>
          </section>
        </>
      )}
    </div>
  );
}

function ArtistDetail({
  group,
  onBack,
  onOpenAlbum,
}: {
  group: ArtistGroup;
  onBack: () => void;
  onOpenAlbum: (path: string) => void;
}) {
  return (
    <div className="space-y-5 pb-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-secondary hover:text-primary"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="15,5 8,12 15,19" />
        </svg>
        Artists
      </button>

      <div className="flex gap-4">
        <Artwork
          cover={group.cover}
          name={group.name}
          className="h-28 w-28 shrink-0 rounded-full sm:h-36 sm:w-36"
        />
        <div className="flex min-w-0 flex-col justify-end gap-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            Artist
          </p>
          <h2 className="break-words text-xl font-bold text-primary sm:text-2xl">
            {group.name}
          </h2>
          <p className="font-mono text-[11px] text-muted">
            {group.albums.length} album{group.albums.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <AlbumGrid>
        {group.albums.map((folder) => (
          <AlbumGridCard
            key={folder.relativePath}
            title={folder.name}
            subtitle={`${folder.trackCount} tracks`}
            cover={folder.cover}
            onClick={() => onOpenAlbum(folder.relativePath)}
          />
        ))}
      </AlbumGrid>
    </div>
  );
}

export default function ListenPage() {
  const listing = useDownloadsListing();
  const likesQuery = useLikes();
  const player = usePlayer();
  const [filter, setFilter] = useState<LibraryFilter>("albums");
  const [sort, setSort] = useState<LibrarySort>("recent");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [shuffleBusy, setShuffleBusy] = useState(false);

  const data = listing.data;

  const folders = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    let list = data.folders;
    if (q) {
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.artist ?? "").toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) =>
      sort === "recent"
        ? b.addedAt.localeCompare(a.addedAt)
        : a.name.localeCompare(b.name)
    );
    return list;
  }, [data, search, sort]);

  const artists = useMemo(() => {
    const map = new Map<string, ArtistGroup>();
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
    list = list.map((g) => ({
      ...g,
      albums: [...g.albums].sort((a, b) =>
        sort === "recent"
          ? b.addedAt.localeCompare(a.addedAt)
          : a.name.localeCompare(b.name)
      ),
    }));
    list.sort((a, b) =>
      sort === "recent"
        ? (b.albums[0]?.addedAt ?? "").localeCompare(a.albums[0]?.addedAt ?? "")
        : a.name.localeCompare(b.name)
    );
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((a) => a.name.toLowerCase().includes(q));
    return list;
  }, [folders, search, sort]);

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

  const likedAsQueue = useMemo<Track[]>(
    () =>
      likedTracks.map((t) => ({
        file: t.file,
        title: t.title,
        artist: t.artist,
        artwork: t.artwork,
      })),
    [likedTracks]
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, sort, search]);

  useEffect(() => {
    setSelectedAlbum(null);
    setSelectedArtist(null);
  }, [filter]);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const hasMoreAlbums = folders.length > visibleCount;
  const hasMoreArtists = artists.length > visibleCount;

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    if (filter === "albums" && !hasMoreAlbums) return;
    if (filter === "artists" && !hasMoreArtists) return;
    if (filter === "liked") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((n) => n + PAGE_SIZE);
        }
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filter, hasMoreAlbums, hasMoreArtists, visibleCount, folders.length, artists.length]);

  const selectedSummary =
    selectedAlbum != null
      ? data?.folders.find((f) => f.relativePath === selectedAlbum) ?? null
      : null;

  const selectedArtistGroup =
    selectedArtist != null
      ? artists.find((a) => a.name.toLowerCase() === selectedArtist) ?? null
      : null;

  const visibleFolders = folders.slice(0, visibleCount);
  const visibleArtists = artists.slice(0, visibleCount);

  const runShuffle = async () => {
    if (filter === "liked") {
      if (likedAsQueue.length > 0) player.playShuffle(likedAsQueue);
      return;
    }
    if (!data) return;
    setShuffleBusy(true);
    try {
      const pool = [...folders];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j]!, pool[i]!];
      }
      const pick = pool.slice(0, Math.min(6, pool.length));
      const loaded = await Promise.all(
        pick.map(async (f) => {
          const res = await fetch(
            `/api/library/downloads?album=${encodeURIComponent(f.relativePath)}`
          );
          const body = await res.json();
          if (!res.ok) return [] as Track[];
          return tracksOf(body.folder as LocalFolder);
        })
      );
      const tracks = loaded.flat();
      if (tracks.length > 0) player.playShuffle(tracks);
    } finally {
      setShuffleBusy(false);
    }
  };

  if (selectedSummary) {
    return (
      <AlbumDetail
        summary={selectedSummary}
        onBack={() => setSelectedAlbum(null)}
      />
    );
  }

  if (selectedArtistGroup) {
    return (
      <ArtistDetail
        group={selectedArtistGroup}
        onBack={() => setSelectedArtist(null)}
        onOpenAlbum={(path) => setSelectedAlbum(path)}
      />
    );
  }

  const canShuffle =
    (filter === "liked" && likedAsQueue.length > 0) ||
    (filter !== "liked" && folders.length > 0);

  const empty =
    (filter === "albums" && folders.length === 0) ||
    (filter === "artists" && artists.length === 0) ||
    (filter === "liked" && likedTracks.length === 0);

  return (
    <div className="space-y-1">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-primary">Listen</h1>
        {canShuffle && (
          <button
            onClick={() => void runShuffle()}
            disabled={shuffleBusy}
            className="flex h-9 items-center gap-2 rounded-lg border border-edge bg-surface px-3 font-mono text-[11px] uppercase tracking-widest text-secondary hover:bg-hover hover:text-primary disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16,3 21,3 21,8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21,16 21,21 16,21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
            {shuffleBusy ? "…" : "Shuffle"}
          </button>
        )}
      </div>

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

      {listing.isLoading && filter !== "liked" && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {filter === "liked" && likesQuery.isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {listing.error && filter !== "liked" && (
        <EmptyState title="Cannot read music" hint={listing.error.message} />
      )}

      {empty && !listing.isLoading && !(filter === "liked" && likesQuery.isLoading) && (
        <EmptyState
          title={
            search
              ? "No matches"
              : filter === "liked"
                ? "No liked tracks yet"
                : filter === "artists"
                  ? "No artists yet"
                  : "Nothing to play yet"
          }
          hint={
            search
              ? "Try a different search."
              : filter === "liked"
                ? "Tap the heart on a track to save it here."
                : "Download some music and it will show up here."
          }
        />
      )}

      {filter === "albums" && visibleFolders.length > 0 && (
        <>
          <AlbumGrid>
            {visibleFolders.map((folder) => (
              <AlbumGridCard
                key={folder.relativePath}
                title={folder.name}
                subtitle={
                  folder.artist ? `Album · ${folder.artist}` : "Album"
                }
                cover={folder.cover}
                onClick={() => setSelectedAlbum(folder.relativePath)}
              />
            ))}
          </AlbumGrid>
          {hasMoreAlbums && (
            <div
              ref={loadMoreRef}
              className="flex justify-center py-8 font-mono text-[11px] text-muted"
            >
              Loading more…
            </div>
          )}
        </>
      )}

      {filter === "artists" && visibleArtists.length > 0 && (
        <>
          <AlbumGrid>
            {visibleArtists.map((artist) => (
              <AlbumGridCard
                key={artist.name}
                title={artist.name}
                subtitle={`${artist.albums.length} album${artist.albums.length === 1 ? "" : "s"}`}
                cover={artist.cover}
                onClick={() => setSelectedArtist(artist.name.toLowerCase())}
              />
            ))}
          </AlbumGrid>
          {hasMoreArtists && (
            <div
              ref={loadMoreRef}
              className="flex justify-center py-8 font-mono text-[11px] text-muted"
            >
              Loading more…
            </div>
          )}
        </>
      )}

      {filter === "liked" && likedTracks.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-edge bg-surface">
          {likedTracks.map((liked, i) => {
            const track = likedAsQueue[i]!;
            const isCurrent = player.track?.file === track.file;
            const isPlayingThis = isCurrent && player.playing;
            return (
              <div
                key={track.file}
                className={cn(
                  "flex min-h-[52px] w-full items-center gap-1 px-2 py-2 hover:bg-hover",
                  i > 0 && "border-t border-edge"
                )}
              >
                <button
                  onClick={() => player.play(track, likedAsQueue)}
                  className="flex min-w-0 flex-1 items-center gap-3 px-1 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-elevated">
                    {track.artwork ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={track.artwork}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-secondary">
                        {isPlayingThis ? "❚❚" : "▶"}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm",
                        isCurrent ? "text-primary" : "text-secondary"
                      )}
                    >
                      {track.title}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-muted">
                      {track.artist ?? "Unknown artist"}
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
