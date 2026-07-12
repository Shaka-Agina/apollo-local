"use client";

import { useMemo, useState } from "react";
import type { SearchResponse, SlskdFile } from "@/lib/types";
import { formatBytes, formatSpeed, parentFolder, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { ResultRow } from "./ResultRow";
import type { FolderDownloadRequest } from "./FolderDownloadDialog";

interface Folder {
  /** Full remote directory path. */
  dir: string;
  /** Display name — last path segment. */
  name: string;
  files: SlskdFile[];
}

function FolderSection({
  folder,
  username,
  onDownload,
  onDownloadFolder,
}: {
  folder: Folder;
  username: string;
  onDownload: (username: string, file: SlskdFile) => Promise<unknown>;
  onDownloadFolder: (request: FolderDownloadRequest) => void;
}) {
  const totalSize = folder.files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div>
      <div className="flex min-h-[40px] items-center gap-2 border-t border-edge bg-base/40 px-3 py-1.5">
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 shrink-0 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z" />
        </svg>
        <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-secondary">
          {folder.name} · {folder.files.length} files · {formatBytes(totalSize)}
        </p>
        <button
          onClick={() =>
            onDownloadFolder({
              username,
              folderName: folder.name,
              files: folder.files,
            })
          }
          className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-edge px-2 font-mono text-[10px] uppercase tracking-wider text-secondary hover:bg-hover hover:text-primary"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="4" x2="12" y2="15" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="5" y1="20" x2="19" y2="20" />
          </svg>
          Folder
        </button>
      </div>
      {folder.files.map((file) => (
        <ResultRow
          key={file.filename}
          file={file}
          onDownload={(f) => onDownload(username, f)}
        />
      ))}
    </div>
  );
}

export function UserResultGroup({
  response,
  onDownload,
  onDownloadFolder,
  defaultOpen,
}: {
  response: SearchResponse;
  onDownload: (username: string, file: SlskdFile) => Promise<unknown>;
  onDownloadFolder: (request: FolderDownloadRequest) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const totalSize = response.files.reduce((sum, f) => sum + f.size, 0);

  const folders = useMemo<Folder[]>(() => {
    const map = new Map<string, Folder>();
    for (const file of response.files) {
      const dir = file.filename.split(/[\\/]/).slice(0, -1).join("\\");
      const existing = map.get(dir);
      if (existing) {
        existing.files.push(file);
      } else {
        map.set(dir, {
          dir,
          name: parentFolder(file.filename) || response.username,
          files: [file],
        });
      }
    }
    return Array.from(map.values());
  }, [response.files, response.username]);

  return (
    <div className="overflow-hidden rounded-lg border border-edge bg-surface">
      <button
        onClick={() => setOpen(!open)}
        className="flex min-h-[52px] w-full items-center gap-3 px-3 py-2 text-left hover:bg-hover"
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
          <p className="truncate font-mono text-sm text-primary">
            {response.username}
          </p>
          <p className="font-mono text-[11px] text-secondary">
            {response.fileCount} files · {formatBytes(totalSize)} ·{" "}
            {formatSpeed(response.uploadSpeed)}
          </p>
        </div>

        {response.hasFreeUploadSlot ? (
          <Badge tone="active">Slot</Badge>
        ) : (
          <Badge tone="muted">Q {response.queueLength}</Badge>
        )}
      </button>

      {open && (
        <div>
          {folders.map((folder) => (
            <FolderSection
              key={folder.dir}
              folder={folder}
              username={response.username}
              onDownload={onDownload}
              onDownloadFolder={onDownloadFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
