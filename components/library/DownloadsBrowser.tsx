"use client";

import { useMemo, useState } from "react";
import { usePlayer } from "@/components/player/PlayerProvider";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, formatBytes } from "@/lib/utils";
import {
  isPlayable,
  useDownloadsListing,
  type LocalFile,
  type LocalFolder,
} from "@/hooks/useDownloads";

function FileRow({ file }: { file: LocalFile }) {
  const player = usePlayer();
  const playable = isPlayable(file.name);
  const isCurrent = player.track?.file === file.relativePath;
  const isPlayingThis = isCurrent && player.playing;

  return (
    <div className="flex min-h-[44px] items-center gap-3 border-t border-edge px-3 py-2 hover:bg-hover">
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm",
            isCurrent ? "text-primary" : "text-secondary"
          )}
        >
          {file.name}
        </p>
        <p className="font-mono text-[11px] text-muted">
          {formatBytes(file.size)}
        </p>
      </div>

      {playable && (
        <button
          onClick={() =>
            player.play({ file: file.relativePath, title: file.name })
          }
          aria-label={isPlayingThis ? "Pause" : "Play"}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
            isCurrent
              ? "border-accent text-primary"
              : "border-edge text-secondary hover:text-primary"
          )}
        >
          {isPlayingThis ? (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M8 5.5v13a.5.5 0 0 0 .77.42l10-6.5a.5.5 0 0 0 0-.84l-10-6.5A.5.5 0 0 0 8 5.5z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

function FolderCard({
  folder,
  defaultOpen,
}: {
  folder: LocalFolder;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-lg border border-edge bg-surface">
      <button
        onClick={() => setOpen(!open)}
        className="flex min-h-[52px] w-full items-center gap-3 px-3 py-2 text-left hover:bg-hover"
      >
        <svg
          viewBox="0 0 24 24"
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted transition-transform",
            open && "rotate-90"
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9,5 16,12 9,19" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-primary">{folder.name}</p>
          <p className="font-mono text-[11px] text-secondary">
            {folder.files.length} files · {formatBytes(folder.totalSize)}
          </p>
        </div>
      </button>
      {open && folder.files.map((f) => <FileRow key={f.relativePath} file={f} />)}
    </div>
  );
}

export function DownloadsBrowser() {
  const [filter, setFilter] = useState("");

  const listing = useDownloadsListing();

  const filtered = useMemo(() => {
    if (!listing.data) return null;
    const q = filter.trim().toLowerCase();
    if (!q) return listing.data;

    const folders = listing.data.folders
      .map((folder) => {
        if (folder.name.toLowerCase().includes(q)) return folder;
        const files = folder.files.filter((f) =>
          f.name.toLowerCase().includes(q)
        );
        return {
          ...folder,
          files,
          totalSize: files.reduce((sum, f) => sum + f.size, 0),
        };
      })
      .filter((f) => f.files.length > 0);

    const rootFiles = listing.data.rootFiles.filter((f) =>
      f.name.toLowerCase().includes(q)
    );

    return { ...listing.data, folders, rootFiles };
  }, [listing.data, filter]);

  if (listing.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (listing.error) {
    return (
      <EmptyState
        title="Cannot read downloads"
        hint={listing.error.message}
      />
    );
  }

  const data = filtered!;
  const isEmpty = data.folders.length === 0 && data.rootFiles.length === 0;

  return (
    <div className="space-y-3">
      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter folders and tracks"
        autoComplete="off"
        spellCheck={false}
      />

      <p className="break-all font-mono text-[11px] text-muted">
        {listing.data!.downloadsDir}
      </p>

      {isEmpty ? (
        <EmptyState
          title={filter ? "No matches" : "Nothing downloaded yet"}
          hint={
            filter
              ? "Try a different filter."
              : "Files you download will show up here."
          }
        />
      ) : (
        <div className="space-y-2">
          {data.folders.map((folder) => (
            <FolderCard
              key={folder.name}
              folder={folder}
              defaultOpen={!!filter}
            />
          ))}
          {data.rootFiles.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-edge bg-surface">
              <p className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted">
                Loose files
              </p>
              {data.rootFiles.map((f) => (
                <FileRow key={f.relativePath} file={f} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
