"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Toggle } from "@/components/ui/Toggle";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

interface SharingState {
  enabled: boolean;
  directories: string[];
}

async function jsonOrThrow(res: Response) {
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body;
}

export function SharingSetting() {
  const queryClient = useQueryClient();

  const sharing = useQuery<SharingState>({
    queryKey: ["sharing"],
    queryFn: async () => jsonOrThrow(await fetch("/api/settings/shares")),
    staleTime: 30_000,
  });

  const update = useMutation({
    mutationFn: async (enabled: boolean) =>
      jsonOrThrow(
        await fetch("/api/settings/shares", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        })
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(["sharing"], data);
      queryClient.invalidateQueries({ queryKey: ["application"] });
      queryClient.invalidateQueries({ queryKey: ["shares"] });
    },
  });

  if (sharing.isLoading) {
    return (
      <div className="flex justify-center rounded-lg border border-edge bg-surface py-6">
        <Spinner />
      </div>
    );
  }

  if (sharing.error) {
    return (
      <div className="rounded-lg border border-edge bg-surface p-4">
        <p className="text-xs text-muted">{sharing.error.message}</p>
      </div>
    );
  }

  const state = sharing.data!;

  return (
    <div className="space-y-3 rounded-lg border border-edge bg-surface p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-secondary">Share files with the network</p>
          <p className="mt-0.5 text-xs text-muted">
            Some users only upload to people who share back. Turning this off
            stops sharing your folders entirely.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {update.isPending && <Spinner className="h-3 w-3" />}
          <Toggle
            checked={state.enabled}
            disabled={update.isPending}
            onChange={(v) => update.mutate(v)}
            label="Share files"
          />
        </div>
      </div>

      {state.directories.length > 0 && (
        <div className="space-y-1 border-t border-edge pt-3">
          {state.directories.map((dir) => (
            <p
              key={dir}
              className={cn(
                "break-all font-mono text-[11px]",
                state.enabled ? "text-secondary" : "text-muted line-through"
              )}
            >
              {dir}
            </p>
          ))}
        </div>
      )}

      {update.error && (
        <p className="text-xs text-destructive">{update.error.message}</p>
      )}
    </div>
  );
}
