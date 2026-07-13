"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Touch-friendly seek control: tall hit target, thin visual track, larger thumb.
 * "Progress" in settings = this bar (not the mm:ss labels).
 */
export function SeekBar({
  currentTime,
  duration,
  onSeek,
  className,
  trackClassName,
  size = "md",
}: {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
  trackClassName?: string;
  size?: "sm" | "md";
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

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
  const hitH = size === "sm" ? "h-11" : "h-12";
  const lineH = size === "sm" ? "h-1.5" : "h-2";
  const thumb = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div
      ref={railRef}
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration) || 0}
      aria-valuenow={Math.round(currentTime)}
      tabIndex={0}
      className={cn(
        "relative flex w-full cursor-pointer touch-none items-center select-none",
        hitH,
        className
      )}
      onPointerDown={(e) => {
        if (!duration) return;
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        applySeek(e.clientX);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        applySeek(e.clientX);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
      }}
      onPointerCancel={() => {
        dragging.current = false;
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
    >
      <span
        className={cn(
          "absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full bg-edge",
          lineH,
          trackClassName
        )}
      />
      <span
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-accent",
          lineH
        )}
        style={{ width: `${progress}%` }}
      />
      <span
        className={cn(
          "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-sm ring-2 ring-base",
          thumb
        )}
        style={{ left: `${progress}%` }}
      />
    </div>
  );
}
