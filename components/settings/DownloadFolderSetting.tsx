"use client";

import { useEffect, useState } from "react";
import { useDirectories, useUpdateDirectories } from "@/hooks/useDirectories";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export function DownloadFolderSetting() {
  const { data, isLoading } = useDirectories();
  const update = useUpdateDirectories();
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.downloads) setValue(data.downloads);
  }, [data?.downloads]);

  if (isLoading) {
    return (
      <div className="flex justify-center rounded-lg border border-edge bg-surface py-6">
        <Spinner />
      </div>
    );
  }

  const dirty = !!data?.downloads && value.trim() !== data.downloads;

  const save = async () => {
    setSaved(false);
    await update.mutateAsync({ downloads: value.trim() });
    setSaved(true);
  };

  return (
    <div className="space-y-3 rounded-lg border border-edge bg-surface p-4">
      <div>
        <p className="text-sm text-secondary">Download folder</p>
        <p className="mt-0.5 text-xs text-muted">
          Where completed downloads are saved. Applied immediately — no restart
          needed.
        </p>
      </div>

      {data?.editable ? (
        <>
          <div className="flex gap-2">
            <Input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setSaved(false);
              }}
              placeholder="C:\Music\Downloads"
              spellCheck={false}
              className="font-mono text-xs"
            />
            <Button
              onClick={save}
              disabled={!dirty || !value.trim() || update.isPending}
              className="w-24 shrink-0"
            >
              {update.isPending ? <Spinner /> : "Save"}
            </Button>
          </div>

          {update.error && (
            <p className="text-xs text-destructive">{update.error.message}</p>
          )}
          {saved && !dirty && (
            <p className="font-mono text-[11px] uppercase tracking-wider text-secondary">
              Saved — new downloads will land here
            </p>
          )}
        </>
      ) : (
        <p className="break-all font-mono text-xs text-primary">
          {data?.downloads ?? "—"}
          <span className="mt-1 block text-muted">
            Set SLSKD_CONFIG_PATH in .env.local to edit this from the app.
          </span>
        </p>
      )}
    </div>
  );
}
