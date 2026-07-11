"use client";

import { useState } from "react";
import type { SlskdFile } from "@/lib/types";
import { baseName, fileExtension, formatBytes, formatDuration } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

type QueueState = "idle" | "pending" | "queued" | "error";

export function ResultRow({
  file,
  onDownload,
}: {
  file: SlskdFile;
  onDownload: (file: SlskdFile) => Promise<unknown>;
}) {
  const [state, setState] = useState<QueueState>("idle");
  const ext = fileExtension(file.filename);

  const handleDownload = async () => {
    if (state === "pending" || state === "queued") return;
    setState("pending");
    try {
      await onDownload(file);
      setState("queued");
    } catch {
      setState("error");
    }
  };

  const meta = [
    ext.toUpperCase(),
    file.bitRate ? `${file.bitRate}${file.isVariableBitRate ? "v" : ""} kbps` : null,
    file.length ? formatDuration(file.length) : null,
    formatBytes(file.size),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex min-h-[44px] items-center gap-3 border-t border-edge px-3 py-2 first:border-t-0 hover:bg-hover">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-primary">{baseName(file.filename)}</p>
        <p className="truncate font-mono text-[11px] text-secondary">{meta}</p>
      </div>

      <button
        onClick={handleDownload}
        disabled={state === "pending" || state === "queued"}
        aria-label={`Download ${baseName(file.filename)}`}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
          state === "queued"
            ? "border-edge text-muted"
            : state === "error"
              ? "border-destructive text-destructive"
              : "border-edge text-secondary hover:bg-elevated hover:text-primary"
        )}
      >
        {state === "pending" ? (
          <Spinner className="h-3.5 w-3.5" />
        ) : state === "queued" ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="5,13 10,18 19,7" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="4" x2="12" y2="15" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="5" y1="20" x2="19" y2="20" />
          </svg>
        )}
      </button>
    </div>
  );
}
