"use client";

import { useEffect, useState } from "react";
import { usePlayer, type Track } from "./PlayerProvider";
import { useUiPrefs } from "@/components/prefs/UiPrefsProvider";
import { Dialog } from "@/components/ui/Dialog";
import { formatBytes } from "@/lib/utils";
import { DATA_SAVER_BITRATE_KBPS } from "@/lib/stream-quality";
import {
  useAddToPlaylist,
  useCreatePlaylist,
  usePlaylists,
} from "@/hooks/usePlaylists";

interface AudioInfo {
  format: string;
  originalBytes: number;
  duration: number;
  originalBitrateKbps: number | null;
  quality: string;
  streamBitrateKbps: number | null;
  streamBytes: number;
  transcoding: boolean;
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

export function PlayerMenu({
  track,
  className,
}: {
  track: Track;
  className?: string;
}) {
  const { streamQuality, duration } = usePlayer();
  const { prefs, setPrefs } = useUiPrefs();
  const [open, setOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [info, setInfo] = useState<AudioInfo | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const playlists = usePlaylists();
  const addToPlaylist = useAddToPlaylist();
  const createPlaylist = useCreatePlaylist();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setInfo(null);
    setInfoError(null);
    void fetch(
      `/api/audio/info?file=${encodeURIComponent(track.file)}&quality=${streamQuality}`
    )
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "Failed to load info");
        if (!cancelled) setInfo(body as AudioInfo);
      })
      .catch((err: Error) => {
        if (!cancelled) setInfoError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [open, track.file, streamQuality]);

  const dataSaver = prefs.streamQuality === "data-saver";
  const streamMb =
    info?.streamBytes ??
    (dataSaver && duration
      ? Math.round((duration * DATA_SAVER_BITRATE_KBPS * 1000) / 8)
      : track.sizeBytes);
  const originalMb = info?.originalBytes ?? track.sizeBytes;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Track options"
        className={
          className ??
          "flex h-10 w-10 items-center justify-center rounded-lg text-secondary hover:text-primary"
        }
      >
        <MoreIcon className="h-5 w-5" />
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Track">
        <div className="space-y-4">
          <div>
            <p className="truncate text-sm font-semibold text-primary">
              {track.title}
            </p>
            <p className="truncate font-mono text-[11px] text-muted">
              {track.artist ?? "Unknown artist"}
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-edge bg-surface p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Stream info
            </p>
            {infoError && (
              <p className="text-xs text-destructive">{infoError}</p>
            )}
            {!info && !infoError && (
              <p className="font-mono text-[11px] text-muted">Loading…</p>
            )}
            {info && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-muted">Format</dt>
                <dd className="font-mono text-secondary uppercase">
                  {info.format}
                  {info.transcoding ? " → Opus" : ""}
                </dd>
                <dt className="text-muted">Bit rate</dt>
                <dd className="font-mono text-secondary">
                  {info.streamBitrateKbps
                    ? `${info.streamBitrateKbps} kbps`
                    : info.originalBitrateKbps
                      ? `${info.originalBitrateKbps} kbps`
                      : "—"}
                  {info.transcoding && info.originalBitrateKbps
                    ? ` (was ${info.originalBitrateKbps})`
                    : ""}
                </dd>
                <dt className="text-muted">This stream</dt>
                <dd className="font-mono text-secondary">
                  {streamMb ? `~${formatBytes(streamMb)}` : "—"}
                </dd>
                <dt className="text-muted">Original file</dt>
                <dd className="font-mono text-secondary">
                  {originalMb ? formatBytes(originalMb) : "—"}
                </dd>
                <dt className="text-muted">Mode</dt>
                <dd className="font-mono text-secondary">
                  {info.transcoding
                    ? "Data saver"
                    : dataSaver
                      ? "Passthrough"
                      : "Original"}
                </dd>
              </dl>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setPrefs({
                streamQuality: dataSaver ? "original" : "data-saver",
              })
            }
            className="flex h-11 w-full items-center justify-between rounded-lg border border-edge bg-surface px-3 text-left text-sm text-secondary hover:bg-hover hover:text-primary"
          >
            <span>Data saver</span>
            <span className="font-mono text-[11px] text-muted">
              {dataSaver ? "On" : "Off"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setPlaylistOpen(true);
            }}
            className="flex h-11 w-full items-center rounded-lg border border-edge bg-surface px-3 text-left text-sm text-secondary hover:bg-hover hover:text-primary"
          >
            Add to playlist
          </button>
        </div>
      </Dialog>

      <Dialog
        open={playlistOpen}
        onClose={() => setPlaylistOpen(false)}
        title="Add to playlist"
      >
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
                    setPlaylistOpen(false);
                  },
                }
              );
            }}
            className="flex gap-2"
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New playlist name"
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

          <div className="max-h-64 overflow-y-auto rounded-lg border border-edge">
            {(playlists.data?.playlists ?? []).length === 0 && (
              <p className="px-3 py-4 text-sm text-muted">No playlists yet.</p>
            )}
            {(playlists.data?.playlists ?? []).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  addToPlaylist.mutate(
                    { playlistId: p.id, track },
                    { onSuccess: () => setPlaylistOpen(false) }
                  );
                }}
                className="flex min-h-[48px] w-full items-center justify-between border-t border-edge px-3 text-left first:border-t-0 hover:bg-hover"
              >
                <span className="truncate text-sm text-secondary">{p.name}</span>
                <span className="shrink-0 font-mono text-[11px] text-muted">
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
