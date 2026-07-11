"use client";

import type { FlatTransfer } from "@/hooks/useTransfers";
import { bucketForState } from "@/lib/types";
import {
  baseName,
  etaSeconds,
  fileExtension,
  formatBytes,
  formatDuration,
  formatSpeed,
} from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { usePlayer } from "@/components/player/PlayerProvider";

const PLAYABLE = new Set(["mp3", "flac", "ogg", "opus", "m4a", "aac", "wav"]);

function stateBadge(transfer: FlatTransfer) {
  const bucket = bucketForState(transfer.state);
  switch (bucket) {
    case "inProgress":
      return <Badge tone="active">Active</Badge>;
    case "queued":
      return (
        <Badge tone="muted">
          {transfer.placeInQueue ? `Queue #${transfer.placeInQueue}` : "Queued"}
        </Badge>
      );
    case "initializing":
      return <Badge tone="default">Starting</Badge>;
    case "completed":
      return <Badge tone="default">Done</Badge>;
    case "errored":
      return <Badge tone="destructive">Failed</Badge>;
  }
}

export function TransferRow({
  transfer,
  onCancel,
  onRetry,
  onRemove,
}: {
  transfer: FlatTransfer;
  onCancel: (t: FlatTransfer) => void;
  onRetry: (t: FlatTransfer) => void;
  onRemove: (t: FlatTransfer) => void;
}) {
  const bucket = bucketForState(transfer.state);
  const active = bucket === "inProgress";
  const eta = etaSeconds(transfer.bytesRemaining, transfer.averageSpeed);
  const player = usePlayer();
  const isPlayable =
    bucket === "completed" && PLAYABLE.has(fileExtension(transfer.filename));
  const isCurrent = player.track?.file === transfer.filename;
  const isPlayingThis = isCurrent && player.playing;

  return (
    <div className="space-y-2 border-t border-edge px-3 py-3 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-primary">
            {baseName(transfer.filename)}
          </p>
          <p className="truncate font-mono text-[11px] text-secondary">
            {transfer.username} · {formatBytes(transfer.size)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {stateBadge(transfer)}

          {(bucket === "queued" || bucket === "initializing" || active) && (
            <button
              onClick={() => onCancel(transfer)}
              aria-label="Cancel"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge text-secondary hover:text-destructive"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          )}

          {bucket === "errored" && (
            <>
              <button
                onClick={() => onRetry(transfer)}
                aria-label="Retry"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge text-secondary hover:text-primary"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 12a8 8 0 1 1-2.34-5.66" />
                  <polyline points="20,3 20,7 16,7" />
                </svg>
              </button>
              <button
                onClick={() => onRemove(transfer)}
                aria-label="Remove"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge text-secondary hover:text-destructive"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </>
          )}

          {bucket === "completed" && (
            <>
              {isPlayable && (
                <button
                  onClick={() =>
                    player.play({
                      file: transfer.filename,
                      title: baseName(transfer.filename),
                    })
                  }
                  aria-label={isPlayingThis ? "Pause" : "Play"}
                  className={
                    isCurrent
                      ? "flex h-8 w-8 items-center justify-center rounded-lg border border-accent text-primary"
                      : "flex h-8 w-8 items-center justify-center rounded-lg border border-edge text-secondary hover:text-primary"
                  }
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
              <button
                onClick={() => onRemove(transfer)}
                aria-label="Clear"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge text-muted hover:text-primary"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {active && (
        <>
          <Progress value={transfer.percentComplete} />
          <div className="flex justify-between font-mono text-[11px] text-secondary">
            <span>
              {formatBytes(transfer.bytesTransferred)} /{" "}
              {formatBytes(transfer.size)}
            </span>
            <span>
              {formatSpeed(transfer.averageSpeed)}
              {eta != null && ` · ${formatDuration(eta)} left`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
