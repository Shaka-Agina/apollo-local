"use client";

import { Toggle } from "@/components/ui/Toggle";
import { useUiPrefs } from "@/components/prefs/UiPrefsProvider";
import { GRID_COLS, type UiPrefs } from "@/lib/ui-prefs";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-edge bg-surface p-4">
      <div>
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-secondary">{hint}</p>}
      </div>
      <div className="divide-y divide-edge border-t border-edge">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm text-secondary">{label}</p>
        {description && (
          <p className="mt-0.5 text-[11px] text-muted">{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function ColStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm text-secondary">{label}</p>
        <p className="mt-0.5 font-mono text-[11px] text-muted">
          {min}–{max} columns
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge text-secondary hover:text-primary disabled:opacity-30"
        >
          −
        </button>
        <span className="w-6 text-center font-mono text-sm text-primary">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge text-secondary hover:text-primary disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function AppearanceSetting() {
  const { prefs, setPrefs, resetPrefs } = useUiPrefs();

  const set = <K extends keyof UiPrefs>(key: K, value: UiPrefs[K]) => {
    setPrefs({ [key]: value });
  };

  return (
    <div className="space-y-3">
      <Section
        title="Album grid"
        hint="How many albums per row. Saved on this device."
      >
        <ColStepper
          label="Mobile columns"
          value={prefs.mobileGridCols}
          min={GRID_COLS.mobile.min}
          max={GRID_COLS.mobile.max}
          onChange={(n) => set("mobileGridCols", n)}
        />
        <ColStepper
          label="Desktop columns"
          value={prefs.desktopGridCols}
          min={GRID_COLS.desktop.min}
          max={GRID_COLS.desktop.max}
          onChange={(n) => set("desktopGridCols", n)}
        />
      </Section>

      <Section
        title="Mini player"
        hint="Collapsed bar while browsing. Default is minimal."
      >
        <ToggleRow
          label="Seek bar"
          description="The scrubber line under the track — not the time numbers"
          checked={prefs.miniShowProgress}
          onChange={(v) => set("miniShowProgress", v)}
        />
        <ToggleRow
          label="Previous / next"
          checked={prefs.miniShowPrevNext}
          onChange={(v) => set("miniShowPrevNext", v)}
        />
        <ToggleRow
          label="Repeat"
          checked={prefs.miniShowRepeat}
          onChange={(v) => set("miniShowRepeat", v)}
        />
        <ToggleRow
          label="Shuffle"
          checked={prefs.miniShowShuffle}
          onChange={(v) => set("miniShowShuffle", v)}
        />
        <ToggleRow
          label="Queue button"
          checked={prefs.miniShowQueue}
          onChange={(v) => set("miniShowQueue", v)}
        />
        <ToggleRow
          label="Show track time"
          description="Under the title instead of (or with) the artist"
          checked={prefs.miniShowTime}
          onChange={(v) => set("miniShowTime", v)}
        />
        <ToggleRow
          label="Close (×) button"
          description="Stops playback and dismisses the player"
          checked={prefs.miniShowClose}
          onChange={(v) => set("miniShowClose", v)}
        />
      </Section>

      <Section
        title="Full player · tap to focus"
        hint="Tap the artwork to enter focus mode. Choose what stays visible."
      >
        <ToggleRow
          label="Hide chrome on tap"
          description="Header, title block, and full controls fade out"
          checked={prefs.focusHideChrome}
          onChange={(v) => set("focusHideChrome", v)}
        />
        <ToggleRow
          label="Hide bottom tab bar"
          description="Gives the album more vertical room on phones"
          checked={prefs.focusHideTabBar}
          onChange={(v) => set("focusHideTabBar", v)}
        />
        <ToggleRow
          label="Show clock"
          description="Current time above the album while focused"
          checked={prefs.focusShowClock}
          onChange={(v) => set("focusShowClock", v)}
        />
        <ToggleRow
          label="Show title / artist"
          checked={prefs.focusShowTitle}
          onChange={(v) => set("focusShowTitle", v)}
        />
        <ToggleRow
          label="Minimal transport"
          description="Previous, play/pause, next"
          checked={prefs.focusShowTransport}
          onChange={(v) => set("focusShowTransport", v)}
        />
        <ToggleRow
          label="Seek bar"
          description="Scrubber line (drag to jump in the track)"
          checked={prefs.focusShowProgress}
          onChange={(v) => set("focusShowProgress", v)}
        />
        <ToggleRow
          label="Track times"
          description="Elapsed / duration numbers (e.g. 1:23 / 3:45)"
          checked={prefs.focusShowTimes}
          onChange={(v) => set("focusShowTimes", v)}
        />
      </Section>

      <button
        type="button"
        onClick={resetPrefs}
        className="h-10 w-full rounded-lg border border-edge bg-surface font-mono text-[11px] uppercase tracking-widest text-secondary hover:bg-hover hover:text-primary"
      >
        Reset appearance defaults
      </button>
    </div>
  );
}
