"use client";

import { useState } from "react";
import { usePlayer } from "./PlayerProvider";
import { cn, formatDuration } from "@/lib/utils";

export function FullPlayer({ onCollapse }: { onCollapse: () => void }) {
  const {
    track,
    playing,
    currentTime,
    duration,
    repeat,
    hasNext,
    hasPrevious,
    toggle,
    seek,
    next,
    previous,
    cycleRepeat,
    stop,
  } = usePlayer();

  const [artFocus, setArtFocus] = useState(false);

  if (!track) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-x-0 top-0 z-[70] flex flex-col bg-base pb-6 pt-[calc(16px+env(safe-area-inset-top))] bottom-[calc(56px+env(safe-area-inset-bottom))] sm:bottom-0 sm:pb-[calc(24px+env(safe-area-inset-bottom))]">
      {/* Header — fades in art-focus */}
      <div
        className={cn(
          "flex items-center justify-between px-5 transition-opacity duration-300",
          artFocus ? "pointer-events-none opacity-0" : "opacity-100"
        )}
      >
        <button
          onClick={onCollapse}
          aria-label="Minimise player"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-secondary hover:text-primary"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="5,9 12,16 19,9" />
          </svg>
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
          Now playing
        </span>
        <button
          onClick={() => {
            stop();
            onCollapse();
          }}
          aria-label="Close player"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:text-primary"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>

      {/* Artwork — tap toggles focus mode */}
      <button
        type="button"
        onClick={() => setArtFocus((v) => !v)}
        aria-label={artFocus ? "Show controls" : "Focus on artwork"}
        className={cn(
          "flex min-h-0 flex-1 items-center justify-center px-8 transition-all duration-300",
          artFocus ? "py-2" : "py-6"
        )}
      >
        <div
          className={cn(
            "flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-edge bg-surface transition-all duration-300",
            artFocus
              ? "max-h-full w-full max-w-lg border-transparent"
              : "max-h-full w-full max-w-sm"
          )}
        >
          {track.artwork ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track.artwork}
              alt={track.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-16 w-16 text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="18" r="3" />
              <path d="M11 18V4l8-2v13" />
              <circle cx="16" cy="15" r="3" />
            </svg>
          )}
        </div>
      </button>

      {/* Controls block — fades when focused on art */}
      <div
        className={cn(
          "transition-opacity duration-300",
          artFocus ? "pointer-events-none opacity-0" : "opacity-100"
        )}
      >
        <div className="px-8">
          <p className="truncate text-lg font-bold text-primary">{track.title}</p>
          <p className="truncate font-mono text-xs text-secondary">
            {track.artist ?? "—"}
          </p>
        </div>

        <div className="px-8 pt-5">
          <button
            aria-label="Seek"
            className="relative block h-6 w-full cursor-pointer"
            onClick={(e) => {
              if (!duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              seek(Math.max(0, Math.min(1, ratio)) * duration);
            }}
          >
            <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-edge" />
            <span
              className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent"
              style={{ width: `${progress}%`, left: 0 }}
            />
            <span
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
              style={{ left: `${progress}%` }}
            />
          </button>
          <div className="flex justify-between font-mono text-[11px] text-secondary">
            <span>{formatDuration(currentTime)}</span>
            <span>{duration ? formatDuration(duration) : "—"}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 px-8 pt-4">
          <button
            onClick={cycleRepeat}
            aria-label={`Repeat: ${repeat}`}
            className={cn(
              "relative flex h-11 w-11 items-center justify-center rounded-lg",
              repeat === "off" ? "text-muted hover:text-secondary" : "text-primary"
            )}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 2l4 4-4 4" />
              <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
              <path d="M7 22l-4-4 4-4" />
              <path d="M21 13v1a4 4 0 0 1-4 4H3" />
            </svg>
            {repeat === "one" && (
              <span className="absolute right-1 top-1 font-mono text-[10px] font-bold">
                1
              </span>
            )}
          </button>

          <button
            onClick={previous}
            disabled={!hasPrevious && currentTime <= 3}
            aria-label="Previous"
            className="flex h-12 w-12 items-center justify-center rounded-lg text-primary disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
              <path d="M6 5h2v14H6zM19.5 5.87v12.26a.5.5 0 0 1-.78.41L9.7 12.4a.5.5 0 0 1 0-.82l9.02-6.13a.5.5 0 0 1 .78.42z" />
            </svg>
          </button>

          <button
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-16 w-16 items-center justify-center rounded-full border border-edge bg-surface text-primary hover:bg-hover"
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7" fill="currentColor">
                <path d="M8 5.5v13a.5.5 0 0 0 .77.42l10-6.5a.5.5 0 0 0 0-.84l-10-6.5A.5.5 0 0 0 8 5.5z" />
              </svg>
            )}
          </button>

          <button
            onClick={next}
            disabled={!hasNext}
            aria-label="Next"
            className="flex h-12 w-12 items-center justify-center rounded-lg text-primary disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
              <path d="M16 5h2v14h-2zM4.5 5.87v12.26a.5.5 0 0 0 .78.41l9.02-6.14a.5.5 0 0 0 0-.82L5.28 5.45a.5.5 0 0 0-.78.42z" />
            </svg>
          </button>

          <span className="h-11 w-11" />
        </div>
      </div>
    </div>
  );
}
