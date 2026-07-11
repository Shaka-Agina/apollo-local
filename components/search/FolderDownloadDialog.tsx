"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formatBytes } from "@/lib/utils";
import type { SlskdFile } from "@/lib/types";

export interface FolderDownloadRequest {
  username: string;
  folderName: string;
  files: SlskdFile[];
}

export function FolderDownloadDialog({
  request,
  onClose,
  onConfirm,
}: {
  request: FolderDownloadRequest | null;
  onClose: () => void;
  onConfirm: (input: {
    username: string;
    files: SlskdFile[];
    folderName: string;
  }) => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (request) {
      setName(request.folderName);
      setError(null);
    }
  }, [request]);

  if (!request) return null;

  const totalSize = request.files.reduce((sum, f) => sum + f.size, 0);

  const confirm = async () => {
    setPending(true);
    setError(null);
    try {
      await onConfirm({
        username: request.username,
        files: request.files,
        folderName: name.trim() || request.folderName,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue downloads");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Download folder">
      <div className="space-y-3">
        <p className="font-mono text-[11px] text-secondary">
          {request.files.length} files · {formatBytes(totalSize)} · from{" "}
          {request.username}
        </p>

        <div>
          <label className="mb-1 block text-xs text-secondary">
            Save as folder
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            spellCheck={false}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !pending) void confirm();
            }}
          />
          <p className="mt-1 text-[11px] text-muted">
            Keep the suggested name or type your own — the folder is renamed
            once every track has finished.
          </p>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={confirm}
            disabled={pending || !name.trim()}
            className="min-w-[10rem] whitespace-nowrap"
          >
            {pending ? <Spinner /> : "Download all"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
