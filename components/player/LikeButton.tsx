"use client";

import { cn } from "@/lib/utils";
import type { Track } from "@/components/player/PlayerProvider";
import { useIsLiked, useToggleLike } from "@/hooks/useLikes";

export function LikeButton({
  track,
  className,
}: {
  track: Track;
  className?: string;
}) {
  const liked = useIsLiked(track.file);
  const toggle = useToggleLike();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle.mutate(track);
      }}
      disabled={toggle.isPending}
      aria-label={liked ? "Unlike" : "Like"}
      aria-pressed={liked}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-50",
        liked
          ? "text-primary"
          : "text-muted hover:text-secondary",
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
    </button>
  );
}
