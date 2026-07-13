"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePlayer } from "./PlayerProvider";
import { FullPlayer } from "./FullPlayer";
import { QueuePanel } from "./QueuePanel";
import { cn, formatDuration } from "@/lib/utils";

export function MiniPlayer() {
  const [expanded, setExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setExpanded(false);
    setShowQueue(false);
  }, [pathname]);

  const {
    track,
    playing,
    currentTime,
    duration,
    repeat,
    shuffle,
    hasNext,
    hasPrevious,
    queue,
    toggle,
    seek,
    next,
    previous,
    cycleRepeat,
    toggleShuffle,
    stop,
  } = usePlayer();

  useEffect(() => {
    if (!track) {
      setExpanded(false);
      setShowQueue(false);
    }
  }, [track]);

  if (!track) return null;

  if (expanded) {
    return (
      <>
        <FullPlayer
          onCollapse={() => setExpanded(false)}
          onOpenQueue={() => setShowQueue(true)}
        />
        {showQueue && <QueuePanel onClose={() => setShowQueue(false)} />}
      </>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-50 border-t border-edge bg-elevated sm:bottom-0 sm:left-16 lg:left-52">
        <button
          aria-label="Seek"
          className="relative block h-1 w-full cursor-pointer bg-edge"
          onClick={(e) => {
            if (!duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            seek(ratio * duration);
          }}
        >
          <span
            className="absolute inset-y-0 left-0 bg-accent"
            style={{ width: `${progress}%` }}
          />
        </button>

        <div className="flex items-center gap-1 px-2 py-2 sm:gap-1.5 sm:px-3">
          <button
            onClick={previous}
            disabled={!hasPrevious && currentTime <= 3}
            aria-label="Previous"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-secondary hover:text-primary disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M6 5h2v14H6zM19.5 5.87v12.26a.5.5 0 0 1-.78.41L9.7 12.4a.5.5 0 0 1 0-.82l9.02-6.13a.5.5 0 0 1 .78.42z" />
            </svg>
          </button>

          <button
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-edge text-primary hover:bg-hover"
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M8 5.5v13a.5.5 0 0 0 .77.42l10-6.5a.5.5 0 0 0 0-.84l-10-6.5A.5.5 0 0 0 8 5.5z" />
              </svg>
            )}
          </button>

          <button
            onClick={next}
            disabled={!hasNext}
            aria-label="Next"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-secondary hover:text-primary disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M16 5h2v14h-2zM4.5 5.87v12.26a.5.5 0 0 0 .78.41l9.02-6.14a.5.5 0 0 0 0-.82L5.28 5.45a.5.5 0 0 0-.78.42z" />
            </svg>
          </button>

          <button
            onClick={() => setExpanded(true)}
            aria-label="Expand player"
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate text-sm text-primary">{track.title}</p>
            <p className="truncate font-mono text-[11px] text-secondary">
              {formatDuration(currentTime)} /{" "}
              {duration ? formatDuration(duration) : "—"}
              {track.artist ? ` · ${track.artist}` : ""}
            </p>
          </button>

          <button
            onClick={() => setShowQueue(true)}
            aria-label="Open queue"
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-secondary hover:text-primary"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="14" y2="17" />
            </svg>
            {queue.length > 1 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-hover px-1 font-mono text-[9px] text-primary">
                {queue.length}
              </span>
            )}
          </button>

          <button
            onClick={toggleShuffle}
            aria-label={`Shuffle: ${shuffle ? "on" : "off"}`}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              shuffle ? "text-primary" : "text-muted hover:text-secondary"
            )}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16,3 21,3 21,8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21,16 21,21 16,21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
          </button>

          <button
            onClick={cycleRepeat}
            aria-label={`Repeat: ${repeat}`}
            className={cn(
              "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              repeat === "off" ? "text-muted hover:text-secondary" : "text-primary"
            )}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 2l4 4-4 4" />
              <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
              <path d="M7 22l-4-4 4-4" />
              <path d="M21 13v1a4 4 0 0 1-4 4H3" />
            </svg>
            {repeat === "one" && (
              <span className="absolute -right-0.5 -top-0.5 font-mono text-[9px] font-bold">
                1
              </span>
            )}
          </button>

          <button
            onClick={stop}
            aria-label="Close player"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:text-primary"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      {showQueue && <QueuePanel onClose={() => setShowQueue(false)} />}
    </>
  );
}
