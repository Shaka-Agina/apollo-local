"use client";

import { useMemo, useState } from "react";
import type { SearchState, SlskdFile } from "@/lib/types";
import { fileExtension } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar, type SearchFilters } from "./FilterBar";
import { UserResultGroup } from "./UserResultGroup";
import type { FolderDownloadRequest } from "./FolderDownloadDialog";

function matchesFilters(file: SlskdFile, filters: SearchFilters): boolean {
  const ext = fileExtension(file.filename);

  if (filters.type === "flac" && ext !== "flac") return false;
  if (filters.type === "mp3" && ext !== "mp3") return false;
  if (filters.type === "other" && (ext === "flac" || ext === "mp3")) return false;

  if (filters.minBitrate > 0 && (file.bitRate ?? 0) < filters.minBitrate) {
    return false;
  }

  return true;
}

export function ResultsList({
  results,
  isPolling,
  onDownload,
  onDownloadFolder,
}: {
  results: SearchState;
  isPolling: boolean;
  onDownload: (username: string, file: SlskdFile) => Promise<unknown>;
  onDownloadFolder: (request: FolderDownloadRequest) => void;
}) {
  const [filters, setFilters] = useState<SearchFilters>({
    type: "all",
    minBitrate: 0,
  });

  const filtered = useMemo(() => {
    const responses = results.responses ?? [];
    return responses
      .map((r) => ({
        ...r,
        files: r.files.filter((f) => matchesFilters(f, filters)),
      }))
      .filter((r) => r.files.length > 0)
      // Best sources first: free slot, then fastest upload speed.
      .sort((a, b) => {
        if (a.hasFreeUploadSlot !== b.hasFreeUploadSlot) {
          return a.hasFreeUploadSlot ? -1 : 1;
        }
        return b.uploadSpeed - a.uploadSpeed;
      });
  }, [results.responses, filters]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <FilterBar filters={filters} onChange={setFilters} />
        <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-secondary">
          {isPolling && <Spinner className="h-3 w-3" />}
          <span>
            {filtered.length} users · {results.fileCount} files
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        isPolling ? (
          <EmptyState title="Searching" hint="Waiting for peers to respond…" />
        ) : (
          <EmptyState
            title="No results"
            hint="Try a broader query or loosen the filters."
          />
        )
      ) : (
        <div className="space-y-2">
          {filtered.map((response, i) => (
            <UserResultGroup
              key={response.username}
              response={response}
              onDownload={onDownload}
              onDownloadFolder={onDownloadFolder}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
