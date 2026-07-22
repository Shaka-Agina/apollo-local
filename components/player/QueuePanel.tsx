"use client";

import { usePlayer } from "./PlayerProvider";
import { cn } from "@/lib/utils";

export function QueuePanel({ onClose }: { onClose: () => void }) {
  const { queue, queueIndex, playAt, removeFromQueue, clearQueue, track } =
    usePlayer();

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-base/80 backdrop-blur-sm">
      <button
        className="absolute inset-0 cursor-default"
        aria-label="Close queue"
        onClick={onClose}
      />
      <div className="relative mt-auto flex max-h-[75vh] flex-col rounded-t-2xl border-t border-edge bg-elevated pb-[env(safe-area-inset-bottom)] sm:mx-auto sm:mb-8 sm:mt-auto sm:w-full sm:max-w-lg sm:rounded-2xl sm:border">
        <div className="flex items-center justify-between border-b border-edge px-4 py-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
              Queue
            </p>
            <p className="text-sm text-secondary">
              {queue.length} track{queue.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="h-9 rounded-lg px-3 font-mono text-[11px] uppercase tracking-widest text-muted hover:bg-hover hover:text-primary"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary hover:bg-hover hover:text-primary"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto">
          {queue.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted">
              Queue is empty. Tap + on a track to add it.
            </p>
          )}
          {queue.map((t, i) => {
            const isCurrent = i === queueIndex && track?.file === t.file;
            return (
              <div
                key={`${t.file}-${i}`}
                className={cn(
                  "flex min-h-[52px] items-center gap-2 border-b border-edge px-3 py-2",
                  isCurrent && "bg-hover"
                )}
              >
                <button
                  onClick={() => {
                    playAt(i);
                    onClose();
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <p
                    className={cn(
                      "truncate text-sm",
                      isCurrent ? "text-primary" : "text-secondary"
                    )}
                  >
                    {t.title}
                  </p>
                  <p className="truncate font-mono text-[11px] text-muted">
                    {isCurrent ? "Now playing" : t.artist ?? "—"}
                  </p>
                </button>
                <button
                  onClick={() => removeFromQueue(i)}
                  aria-label="Remove from queue"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-primary"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AddToQueueButton({
  track,
  className,
}: {
  track: { file: string; title: string; artist?: string; artwork?: string };
  className?: string;
}) {
  const { addToQueue } = usePlayer();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        addToQueue(track);
      }}
      aria-label="Add to queue"
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-primary",
        className
      )}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
        <line x1="4" y1="7" x2="20" y2="7" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="17" x2="14" y2="17" />
      </svg>
    </button>
  );
}
