"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Thin visual seek line with a large invisible hit/drag target.
 * Settings “Seek bar” = this control (not the mm:ss labels).
 */
export function SeekBar({
  currentTime,
  duration,
  onSeek,
  className,
  size = "md",
}: {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [active, setActive] = useState(false);

  const ratioFromClientX = useCallback((clientX: number) => {
    const el = railRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const applySeek = useCallback(
    (clientX: number) => {
      if (!duration) return;
      onSeek(ratioFromClientX(clientX) * duration);
    },
    [duration, onSeek, ratioFromClientX]
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hitPad = size === "sm" ? "-top-4 -bottom-4" : "-top-5 -bottom-5";

  return (
    <div
      ref={railRef}
      className={cn("relative h-1 w-full select-none", className)}
    >
      <div
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration) || 0}
        aria-valuenow={Math.round(currentTime)}
        tabIndex={0}
        className={cn(
          "absolute inset-x-0 z-10 cursor-pointer touch-none outline-none",
          hitPad
        )}
        onPointerDown={(e) => {
          if (!duration) return;
          dragging.current = true;
          setActive(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          applySeek(e.clientX);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          applySeek(e.clientX);
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          setActive(false);
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            /* already released */
          }
        }}
        onPointerCancel={() => {
          dragging.current = false;
          setActive(false);
        }}
        onKeyDown={(e) => {
          if (!duration) return;
          const step = Math.max(1, duration * 0.02);
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            onSeek(Math.min(duration, currentTime + step));
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            onSeek(Math.max(0, currentTime - step));
          } else if (e.key === "Home") {
            e.preventDefault();
            onSeek(0);
          } else if (e.key === "End") {
            e.preventDefault();
            onSeek(duration);
          }
        }}
      />
      <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-edge" />
      <span
        className="pointer-events-none absolute left-0 top-1/2 h-px -translate-y-1/2 bg-accent"
        style={{ width: `${progress}%` }}
      />
      <span
        className={cn(
          "pointer-events-none absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary transition-transform",
          active ? "h-3 w-3" : "h-2 w-2"
        )}
        style={{ left: `${progress}%` }}
      />
    </div>
  );
}
