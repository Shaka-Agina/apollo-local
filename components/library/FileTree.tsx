"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Share, ShareDirectory } from "@/lib/types";
import { baseName, cn, formatBytes } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";

function Chevron({ open }: { open: boolean }) {
  return (
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
  );
}

function DirectoryNode({ dir }: { dir: ShareDirectory }) {
  const [open, setOpen] = useState(false);
  const files = dir.files ?? [];

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-left hover:bg-hover"
      >
        <Chevron open={open} />
        <span className="min-w-0 flex-1 truncate text-sm text-primary">
          {baseName(dir.name)}
        </span>
        <span className="font-mono text-[11px] text-muted">
          {files.length || dir.fileCount || 0}
        </span>
      </button>

      {open && files.length > 0 && (
        <div className="border-l border-edge ml-4">
          {files.map((file) => (
            <div
              key={file.filename}
              className="flex items-center justify-between gap-3 px-3 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-xs text-secondary">
                {baseName(file.filename)}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-muted">
                {formatBytes(file.size)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShareNode({ share }: { share: Share }) {
  const [open, setOpen] = useState(false);

  const contents = useQuery<ShareDirectory[]>({
    queryKey: ["share-contents", share.id],
    queryFn: async () => {
      const res = await fetch(`/api/shares?id=${encodeURIComponent(share.id)}`);
      if (!res.ok) throw new Error("Failed to load share contents");
      return res.json();
    },
    enabled: open,
    staleTime: 60_000,
  });

  return (
    <div className="overflow-hidden rounded-lg border border-edge bg-surface">
      <button
        onClick={() => setOpen(!open)}
        className="flex min-h-[52px] w-full items-center gap-3 px-3 py-2 text-left hover:bg-hover"
      >
        <Chevron open={open} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm text-primary">
            {share.alias || share.localPath}
          </p>
          <p className="truncate font-mono text-[11px] text-secondary">
            {share.localPath}
          </p>
        </div>
      </button>

      {open && (
        <div className="border-t border-edge">
          {contents.isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : contents.error ? (
            <p className="px-3 py-4 text-xs text-muted">
              Could not load contents.
            </p>
          ) : (contents.data ?? []).length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted">Empty.</p>
          ) : (
            (contents.data ?? []).map((dir) => (
              <DirectoryNode key={dir.name} dir={dir} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function FileTree({ shares }: { shares: Share[] }) {
  return (
    <div className="space-y-2">
      {shares.map((share) => (
        <ShareNode key={share.id} share={share} />
      ))}
    </div>
  );
}
