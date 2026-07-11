"use client";

import { useMemo } from "react";
import {
  useCancelTransfer,
  useRetryTransfer,
  type FlatTransfer,
} from "@/hooks/useTransfers";
import { bucketForState } from "@/lib/types";
import { parentFolder } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TransferRow } from "./TransferRow";
import { FolderGroup, type TransferGroup } from "./FolderGroup";

/**
 * Sort weight for a group/single: anything active floats to the top,
 * then queued, then failed, completed last.
 */
function activityWeight(files: FlatTransfer[]): number {
  const buckets = files.map((f) => bucketForState(f.state));
  if (buckets.some((b) => b === "inProgress" || b === "initializing")) return 0;
  if (buckets.some((b) => b === "queued")) return 1;
  if (buckets.some((b) => b === "errored")) return 2;
  return 3;
}

export function TransferList({ transfers }: { transfers: FlatTransfer[] }) {
  const cancel = useCancelTransfer();
  const retry = useRetryTransfer();

  const groups = useMemo(() => {
    const map = new Map<string, TransferGroup>();
    for (const t of transfers) {
      // Group by the remote parent folder per user — one entry per album/folder.
      const dir = t.filename.split(/[\\/]/).slice(0, -1).join("\\");
      const key = `${t.username}|${dir}`;
      const existing = map.get(key);
      if (existing) {
        existing.files.push(t);
      } else {
        map.set(key, {
          key,
          username: t.username,
          folder: parentFolder(t.filename) || dir || t.username,
          files: [t],
        });
      }
    }
    return [...map.values()].sort(
      (a, b) => activityWeight(a.files) - activityWeight(b.files)
    );
  }, [transfers]);

  const failed = transfers.filter((t) => bucketForState(t.state) === "errored");
  const completed = transfers.filter(
    (t) => bucketForState(t.state) === "completed"
  );

  const retryAllFailed = () => {
    for (const t of failed) {
      retry.mutate({
        id: t.id,
        username: t.username,
        filename: t.filename,
        size: t.size,
      });
    }
  };

  const clearAll = (items: FlatTransfer[]) => {
    for (const t of items) {
      cancel.mutate({ id: t.id, username: t.username, remove: true });
    }
  };

  if (transfers.length === 0) {
    return (
      <EmptyState
        title="Queue empty"
        hint="Downloads you queue from Search will show up here."
      />
    );
  }

  const handlers = {
    onCancel: (x: FlatTransfer) =>
      cancel.mutate({ id: x.id, username: x.username }),
    onRetry: (x: FlatTransfer) =>
      retry.mutate({
        id: x.id,
        username: x.username,
        filename: x.filename,
        size: x.size,
      }),
    onRemove: (x: FlatTransfer) =>
      cancel.mutate({ id: x.id, username: x.username, remove: true }),
  };

  return (
    <div className="space-y-3">
      {(failed.length > 0 || completed.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {failed.length > 0 && (
            <>
              <Button size="sm" onClick={retryAllFailed}>
                Retry all failed ({failed.length})
              </Button>
              <Button size="sm" variant="destructive" onClick={() => clearAll(failed)}>
                Clear failed
              </Button>
            </>
          )}
          {completed.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => clearAll(completed)}>
              Clear completed ({completed.length})
            </Button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {groups.map((group) =>
          group.files.length === 1 ? (
            <div
              key={group.key}
              className="overflow-hidden rounded-lg border border-edge bg-surface"
            >
              <TransferRow transfer={group.files[0]} {...handlers} />
            </div>
          ) : (
            <FolderGroup key={group.key} group={group} {...handlers} />
          )
        )}
      </div>
    </div>
  );
}
