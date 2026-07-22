"use client";

import { Toggle } from "@/components/ui/Toggle";
import { useUiPrefs } from "@/components/prefs/UiPrefsProvider";

export function StreamingSetting() {
  const { prefs, setPrefs } = useUiPrefs();
  const dataSaver = prefs.streamQuality === "data-saver";

  return (
    <div className="rounded-lg border border-edge bg-surface p-4">
      <div>
        <h3 className="text-sm font-semibold text-primary">Streaming quality</h3>
        <p className="mt-0.5 text-xs text-secondary">
          When away from home, lossless FLAC can burn mobile data. Data saver
          converts those tracks to Opus ~96 kbps on the server.
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 border-t border-edge pt-3">
        <div className="min-w-0">
          <p className="text-sm text-secondary">Data saver</p>
          <p className="mt-0.5 text-[11px] text-muted">
            {dataSaver
              ? "On — FLAC/WAV stream as Opus ~96 kbps (default)"
              : "Off — stream original files (including FLAC)"}
          </p>
        </div>
        <Toggle
          checked={dataSaver}
          onChange={(v) =>
            setPrefs({ streamQuality: v ? "data-saver" : "original" })
          }
          label="Data saver"
        />
      </div>
    </div>
  );
}
