"use client";

import { useState } from "react";
import type { Track } from "./PlayerProvider";
import { Dialog } from "@/components/ui/Dialog";
import {
  useAddToPlaylist,
  useCreatePlaylist,
  usePlaylists,
} from "@/hooks/usePlaylists";

export function AddToPlaylistButton({ track }: { track: Track }) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const playlists = usePlaylists();
  const addToPlaylist = useAddToPlaylist();
  const createPlaylist = useCreatePlaylist();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add to playlist"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:text-primary"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M8 6h13M8 12h13M8 18h8" />
          <path d="M3 6h.01M3 12h.01M3 18h.01" />
          <path d="M18 15v6M15 18h6" />
        </svg>
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Add to playlist">
        <div className="space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = newName.trim();
              if (!name) return;
              createPlaylist.mutate(
                { name },
                {
                  onSuccess: (data) => {
                    addToPlaylist.mutate({
                      playlistId: data.playlist.id,
                      track,
                    });
                    setNewName("");
                    setOpen(false);
                  },
                }
              );
            }}
            className="flex gap-2"
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New playlist"
              className="h-10 min-w-0 flex-1 rounded-lg border border-edge bg-surface px-3 text-sm text-primary placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={!newName.trim() || createPlaylist.isPending}
              className="h-10 shrink-0 rounded-lg border border-edge bg-hover px-3 font-mono text-[11px] uppercase tracking-widest text-primary disabled:opacity-40"
            >
              Create
            </button>
          </form>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-edge">
            {(playlists.data?.playlists ?? []).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  addToPlaylist.mutate(
                    { playlistId: p.id, track },
                    { onSuccess: () => setOpen(false) }
                  )
                }
                className="flex min-h-[44px] w-full items-center justify-between border-t border-edge px-3 text-left first:border-t-0 hover:bg-hover"
              >
                <span className="truncate text-sm text-secondary">{p.name}</span>
                <span className="font-mono text-[11px] text-muted">
                  {p.tracks.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Dialog>
    </>
  );
}
