"use client";

import { useState } from "react";
import type { FlatTransfer } from "@/hooks/useTransfers";
import { bucketForState } from "@/lib/types";
import { cn, formatBytes, formatSpeed } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { TransferRow } from "./TransferRow";

export interface TransferGroup {
  key: string;
  username: string;
  /** Last segment of the remote directory — the album/folder name. */
  folder: string;
  files: FlatTransfer[];
}

export function FolderGroup({
  group,
  onCancel,
  onRetry,
  onRemove,
}: {
  group: TransferGroup;
  onCancel: (t: FlatTransfer) => void;
  onRetry: (t: FlatTransfer) => void;
  onRemove: (t: FlatTransfer) => void;
}) {
  const buckets = group.files.map((f) => bucketForState(f.state));
  const active = buckets.filter((b) => b === "inProgress").length;
  const pending = buckets.filter(
    (b) => b === "queued" || b === "initializing"
  ).length;
  const failed = buckets.filter((b) => b === "errored").length;
  const done = buckets.filter((b) => b === "completed").length;
  const allDone = done === group.files.length;

  const [open, setOpen] = useState(!allDone);

  const totalSize = group.files.reduce((sum, f) => sum + f.size, 0);
  const transferred = group.files.reduce((sum, f) => sum + f.bytesTransferred, 0);
  const percent = totalSize > 0 ? (transferred / totalSize) * 100 : 0;
  const speed = group.files
    .filter((_, i) => buckets[i] === "inProgress")
    .reduce((sum, f) => sum + f.averageSpeed, 0);

  const cancellable = group.files.filter((_, i) =>
    ["inProgress", "queued", "initializing"].includes(buckets[i])
  );

  return (
    <div className="overflow-hidden rounded-lg border border-edge bg-surface">
      <div className="flex items-center gap-2 pr-2">
        <button
          onClick={() => setOpen(!open)}
          className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left hover:bg-hover"
        >
          <svg
            viewBox="0 0 24 24"
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted transition-transform",
              open && "rotate-90"
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9,5 16,12 9,19" />
          </svg>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-primary">{group.folder}</p>
            <p className="truncate font-mono text-[11px] text-secondary">
              {group.username} · {done}/{group.files.length} files ·{" "}
              {formatBytes(totalSize)}
              {active > 0 && ` · ${formatSpeed(speed)}`}
            </p>
          </div>

          {failed > 0 ? (
            <Badge tone="destructive">{failed} failed</Badge>
          ) : allDone ? (
            <Badge tone="default">Done</Badge>
          ) : active > 0 ? (
            <Badge tone="active">Active</Badge>
          ) : pending > 0 ? (
            <Badge tone="muted">Queued</Badge>
          ) : null}
        </button>

        {cancellable.length > 0 && (
          <button
            onClick={() => cancellable.forEach(onCancel)}
            aria-label="Cancel folder"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-edge text-secondary hover:text-destructive"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {!allDone && (
        <div className="px-3 pb-2">
          <Progress value={percent} />
        </div>
      )}

      {open && (
        <div className="border-t border-edge">
          {group.files.map((t) => (
            <TransferRow
              key={`${t.username}:${t.id}`}
              transfer={t}
              onCancel={onCancel}
              onRetry={onRetry}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
