"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "./PlayerProvider";
import { SeekBar } from "./SeekBar";
import { LikeButton } from "./LikeButton";
import { useUiPrefs } from "@/components/prefs/UiPrefsProvider";
import { usePlayerChrome } from "@/components/prefs/PlayerChromeProvider";
import { cn, formatDuration } from "@/lib/utils";

function FocusClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <p className="pointer-events-none font-mono text-sm tracking-[0.2em] text-secondary">
      {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </p>
  );
}

export function FullPlayer({
  onCollapse,
  onOpenQueue,
}: {
  onCollapse: () => void;
  onOpenQueue: () => void;
}) {
  const {
    track,
    playing,
    currentTime,
    duration,
    repeat,
    shuffle,
    queue,
    hasNext,
    hasPrevious,
    toggle,
    seek,
    next,
    previous,
    cycleRepeat,
    toggleShuffle,
    stop,
  } = usePlayer();

  const { prefs } = useUiPrefs();
  const { artFocus, setArtFocus } = usePlayerChrome();

  if (!track) return null;

  const focused = artFocus && prefs.focusHideChrome;
  const hideTabs = artFocus && prefs.focusHideTabBar;
  const showFocusOverlay =
    artFocus &&
    (prefs.focusShowClock ||
      prefs.focusShowTitle ||
      prefs.focusShowTransport ||
      prefs.focusShowProgress ||
      prefs.focusShowTimes);

  const seekBar = (
    <SeekBar
      currentTime={currentTime}
      duration={duration}
      onSeek={seek}
      size="md"
    />
  );

  const transport = (
    <div className="flex items-center justify-center gap-5">
      <button
        onClick={toggleShuffle}
        aria-label={`Shuffle: ${shuffle ? "on" : "off"}`}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-lg",
          shuffle ? "text-primary" : "text-muted hover:text-secondary"
        )}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16,3 21,3 21,8" />
          <line x1="4" y1="20" x2="21" y2="3" />
          <polyline points="21,16 21,21 16,21" />
          <line x1="15" y1="15" x2="21" y2="21" />
          <line x1="4" y1="4" x2="9" y2="9" />
        </svg>
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
    </div>
  );

  const minimalTransport = (
    <div className="flex items-center justify-center gap-6">
      <button
        onClick={previous}
        disabled={!hasPrevious && currentTime <= 3}
        aria-label="Previous"
        className="flex h-11 w-11 items-center justify-center text-primary disabled:opacity-30"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M6 5h2v14H6zM19.5 5.87v12.26a.5.5 0 0 1-.78.41L9.7 12.4a.5.5 0 0 1 0-.82l9.02-6.13a.5.5 0 0 1 .78.42z" />
        </svg>
      </button>
      <button
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-edge bg-surface/80 text-primary backdrop-blur-sm"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6" fill="currentColor">
            <path d="M8 5.5v13a.5.5 0 0 0 .77.42l10-6.5a.5.5 0 0 0 0-.84l-10-6.5A.5.5 0 0 0 8 5.5z" />
          </svg>
        )}
      </button>
      <button
        onClick={next}
        disabled={!hasNext}
        aria-label="Next"
        className="flex h-11 w-11 items-center justify-center text-primary disabled:opacity-30"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M16 5h2v14h-2zM4.5 5.87v12.26a.5.5 0 0 0 .78.41l9.02-6.14a.5.5 0 0 0 0-.82L5.28 5.45a.5.5 0 0 0-.78.42z" />
        </svg>
      </button>
    </div>
  );

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-[70] bg-base pt-[env(safe-area-inset-top)]",
        hideTabs
          ? "bottom-0 pb-[env(safe-area-inset-bottom)]"
          : "bottom-[calc(56px+env(safe-area-inset-bottom))] sm:bottom-0 sm:pb-[env(safe-area-inset-bottom)]"
      )}
    >
      {/* Absolute chrome — does not push artwork off-center when hidden */}
      <div
        className={cn(
          "absolute inset-x-0 top-[env(safe-area-inset-top)] z-10 flex items-center justify-between px-5 pt-4 transition-opacity duration-300",
          focused ? "pointer-events-none opacity-0" : "opacity-100"
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
        <div className="flex items-center gap-1">
          <LikeButton track={track} className="h-10 w-10" />
          <button
            onClick={onOpenQueue}
            aria-label="Open queue"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-secondary hover:text-primary"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="14" y2="17" />
            </svg>
            {queue.length > 1 && (
              <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-hover px-1 font-mono text-[9px] text-primary">
                {queue.length}
              </span>
            )}
          </button>
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
      </div>

      {/* Artwork stage — centers in focus; sits above controls otherwise */}
      <button
        type="button"
        onClick={() => setArtFocus((v) => !v)}
        aria-label={artFocus ? "Show controls" : "Focus on artwork"}
        className={cn(
          "absolute inset-0 flex items-center justify-center px-8 transition-[padding] duration-300",
          focused ? "pb-8 pt-8" : "pb-56 pt-20"
        )}
      >
        <div
          className={cn(
            "aspect-square overflow-hidden rounded-lg border bg-surface transition-all duration-300",
            focused
              ? "h-[min(72vmin,28rem)] w-[min(72vmin,28rem)] border-transparent"
              : "h-[min(55vmin,20rem)] w-[min(55vmin,20rem)] border-edge"
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
            <div className="flex h-full w-full items-center justify-center">
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
            </div>
          )}
        </div>
      </button>

      {/* Focus overlays (optional) */}
      {artFocus && prefs.focusShowClock && (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+1.5rem)] z-10 flex justify-center">
          <FocusClock />
        </div>
      )}

      {artFocus && showFocusOverlay && (
        <div className="absolute inset-x-0 bottom-0 z-10 space-y-3 px-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
          {prefs.focusShowTitle && (
            <div className="text-center">
              <p className="truncate text-base font-semibold text-primary">
                {track.title}
              </p>
              <p className="truncate font-mono text-xs text-secondary">
                {track.artist ?? "—"}
              </p>
            </div>
          )}
          {prefs.focusShowProgress && seekBar}
          {prefs.focusShowTimes && (
            <div className="flex justify-between font-mono text-[11px] text-secondary">
              <span>{formatDuration(currentTime)}</span>
              <span>{duration ? formatDuration(duration) : "—"}</span>
            </div>
          )}
          {prefs.focusShowTransport && minimalTransport}
        </div>
      )}

      {/* Normal (non-focus) controls docked at bottom */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 space-y-1 px-8 pb-6 pt-4 transition-opacity duration-300 sm:pb-8",
          focused ? "pointer-events-none opacity-0" : "opacity-100"
        )}
      >
        <div>
          <p className="truncate text-lg font-bold text-primary">{track.title}</p>
          <p className="truncate font-mono text-xs text-secondary">
            {track.artist ?? "—"}
          </p>
        </div>
        <div className="pt-3">{seekBar}</div>
        <div className="flex justify-between font-mono text-[11px] text-secondary">
          <span>{formatDuration(currentTime)}</span>
          <span>{duration ? formatDuration(duration) : "—"}</span>
        </div>
        <div className="pt-3">{transport}</div>
      </div>
    </div>
  );
}
