"use client";

import { useState } from "react";
import { useSearch } from "@/hooks/useSearch";
import { useEnqueueDownloads } from "@/hooks/useTransfers";
import type { SlskdFile } from "@/lib/types";
import { SearchBar } from "@/components/search/SearchBar";
import { ResultsList } from "@/components/search/ResultsList";
import {
  FolderDownloadDialog,
  type FolderDownloadRequest,
} from "@/components/search/FolderDownloadDialog";
import { EmptyState } from "@/components/ui/EmptyState";

export default function SearchPage() {
  const { search, isStarting, startError, results, isPolling } = useSearch();
  const enqueue = useEnqueueDownloads();
  const [folderRequest, setFolderRequest] =
    useState<FolderDownloadRequest | null>(null);

  const handleDownload = (username: string, file: SlskdFile) =>
    enqueue.mutateAsync({
      username,
      files: [{ filename: file.filename, size: file.size }],
    });

  const handleFolderConfirm = (input: {
    username: string;
    files: SlskdFile[];
    folderName: string;
  }) =>
    enqueue.mutateAsync({
      username: input.username,
      files: input.files.map((f) => ({ filename: f.filename, size: f.size })),
      folderName: input.folderName,
    });

  return (
    <div className="space-y-4">
      <h1 className="font-mono text-lg font-bold uppercase tracking-[0.2em] text-primary">
        Search
      </h1>

      <SearchBar onSearch={search} isSearching={isStarting || isPolling} />

      {startError && (
        <p className="rounded-lg border border-destructive px-3 py-2 text-xs text-destructive">
          {startError.message}
        </p>
      )}

      {results ? (
        <ResultsList
          results={results}
          isPolling={isPolling}
          onDownload={handleDownload}
          onDownloadFolder={setFolderRequest}
        />
      ) : (
        !isStarting && (
          <EmptyState
            title="Find music"
            hint="Search the Soulseek network. Results stream in as peers respond."
          />
        )
      )}

      <FolderDownloadDialog
        request={folderRequest}
        onClose={() => setFolderRequest(null)}
        onConfirm={handleFolderConfirm}
      />
    </div>
  );
}
