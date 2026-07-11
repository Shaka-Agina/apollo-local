"use client";

import { useMemo, useState } from "react";
import { usePlayer, type Track } from "@/components/player/PlayerProvider";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, formatBytes } from "@/lib/utils";
import {
  audioUrl,
  isPlayable,
  useDownloadsListing,
  type LocalFile,
  type LocalFolder,
} from "@/hooks/useDownloads";

function Artwork({
  cover,
  name,
  className,
}: {
  cover: string | null;
  name: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden bg-surface",
        className
      )}
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={audioUrl(cover)}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="select-none font-mono text-3xl font-bold text-muted">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function tracksOf(folder: LocalFolder): Track[] {
  return folder.files.filter((f) => isPlayable(f.name)).map((f) => ({
    file: f.relativePath,
    title: f.name.replace(/\.[^.]+$/, ""),
    artist: folder.name,
    artwork: folder.cover ? audioUrl(folder.cover) : undefined,
  }));
}

function AlbumDetail({
  folder,
  onBack,
}: {
  folder: LocalFolder;
  onBack: () => void;
}) {
  const player = usePlayer();
  const tracks = useMemo(() => tracksOf(folder), [folder]);
  const audioFiles = folder.files.filter((f) => isPlayable(f.name));

  const playFrom = (file: LocalFile) => {
    const track = tracks.find((t) => t.file === file.relativePath);
    if (track) player.play(track, tracks);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-secondary hover:text-primary"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15,5 8,12 15,19" />
        </svg>
        Albums
      </button>

      <div className="flex gap-4">
        <Artwork
          cover={folder.cover}
          name={folder.name}
          className="h-28 w-28 shrink-0 rounded-lg border border-edge sm:h-36 sm:w-36"
        />
        <div className="flex min-w-0 flex-col justify-end gap-2">
          <h2 className="break-words text-base font-bold text-primary sm:text-lg">
            {folder.name}
          </h2>
          <p className="font-mono text-[11px] text-secondary">
            {audioFiles.length} tracks · {formatBytes(folder.totalSize)}
          </p>
          {tracks.length > 0 && (
            <button
              onClick={() => player.play(tracks[0], tracks)}
              className="flex h-9 w-fit items-center gap-2 rounded-lg border border-edge bg-surface px-4 font-mono text-[11px] uppercase tracking-widest text-primary hover:bg-hover"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                <path d="M8 5.5v13a.5.5 0 0 0 .77.42l10-6.5a.5.5 0 0 0 0-.84l-10-6.5A.5.5 0 0 0 8 5.5z" />
              </svg>
              Play
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-edge bg-surface">
        {audioFiles.length === 0 && (
          <p className="px-3 py-4 text-sm text-muted">No playable tracks.</p>
        )}
        {audioFiles.map((file, i) => {
          const isCurrent = player.track?.file === file.relativePath;
          const isPlayingThis = isCurrent && player.playing;
          return (
            <button
              key={file.relativePath}
              onClick={() => playFrom(file)}
              className={cn(
                "flex min-h-[48px] w-full items-center gap-3 px-3 py-2 text-left hover:bg-hover",
                i > 0 && "border-t border-edge"
              )}
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
          );
        })}
      </div>
    </div>
  );
}

export default function ListenPage() {
  const listing = useDownloadsListing();
  const player = usePlayer();
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const data = listing.data;

  const filteredFolders = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return data.folders;
    return data.folders.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.files.some((file) => file.name.toLowerCase().includes(q))
    );
  }, [data, filter]);

  const singles = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    const playable = data.rootFiles.filter((f) => isPlayable(f.name));
    if (!q) return playable;
    return playable.filter((f) => f.name.toLowerCase().includes(q));
  }, [data, filter]);

  const singleTracks = useMemo<Track[]>(
    () =>
      singles.map((f) => ({
        file: f.relativePath,
        title: f.name.replace(/\.[^.]+$/, ""),
      })),
    [singles]
  );

  const selectedFolder =
    selected != null
      ? data?.folders.find((f) => f.name === selected) ?? null
      : null;

  if (selectedFolder) {
    return (
      <AlbumDetail folder={selectedFolder} onBack={() => setSelected(null)} />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="font-mono text-lg font-bold uppercase tracking-[0.2em] text-primary">
        Listen
      </h1>

      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search your music"
        autoComplete="off"
        spellCheck={false}
      />

      {listing.isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {listing.error && (
        <EmptyState title="Cannot read music" hint={listing.error.message} />
      )}

      {data && filteredFolders.length === 0 && singles.length === 0 && (
        <EmptyState
          title={filter ? "No matches" : "Nothing to play yet"}
          hint={
            filter
              ? "Try a different search."
              : "Download some music and it will show up here."
          }
        />
      )}

      {filteredFolders.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {filteredFolders.map((folder) => (
            <button
              key={folder.name}
              onClick={() => setSelected(folder.name)}
              className="group overflow-hidden rounded-lg border border-edge bg-surface text-left transition-colors hover:bg-hover"
            >
              <Artwork
                cover={folder.cover}
                name={folder.name}
                className="aspect-square w-full"
              />
              <div className="p-2.5">
                <p className="truncate text-sm text-primary">{folder.name}</p>
                <p className="font-mono text-[11px] text-secondary">
                  {folder.files.filter((f) => isPlayable(f.name)).length} tracks
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {singles.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted">
            Singles
          </h2>
          <div className="overflow-hidden rounded-lg border border-edge bg-surface">
            {singles.map((file, i) => {
              const isCurrent = player.track?.file === file.relativePath;
              const isPlayingThis = isCurrent && player.playing;
              return (
                <button
                  key={file.relativePath}
                  onClick={() => player.play(singleTracks[i], singleTracks)}
                  className={cn(
                    "flex min-h-[48px] w-full items-center gap-3 px-3 py-2 text-left hover:bg-hover",
                    i > 0 && "border-t border-edge"
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-edge text-secondary">
                    {isPlayingThis ? (
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                        <rect x="6" y="5" width="4" height="14" rx="1" />
                        <rect x="14" y="5" width="4" height="14" rx="1" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                        <path d="M8 5.5v13a.5.5 0 0 0 .77.42l10-6.5a.5.5 0 0 0 0-.84l-10-6.5A.5.5 0 0 0 8 5.5z" />
                      </svg>
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
