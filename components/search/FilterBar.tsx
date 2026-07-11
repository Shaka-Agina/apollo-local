"use client";

import { cn } from "@/lib/utils";

export type TypeFilter = "all" | "flac" | "mp3" | "other";

export interface SearchFilters {
  type: TypeFilter;
  minBitrate: number; // 0 = off
}

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "flac", label: "FLAC" },
  { value: "mp3", label: "MP3" },
  { value: "other", label: "Other" },
];

const BITRATE_OPTIONS = [0, 192, 256, 320];

export function FilterBar({
  filters,
  onChange,
}: {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex overflow-hidden rounded-lg border border-edge">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange({ ...filters, type: opt.value })}
            className={cn(
              "h-8 px-3 font-mono text-[11px] uppercase tracking-wider transition-colors",
              filters.type === opt.value
                ? "bg-hover text-primary"
                : "text-muted hover:text-secondary"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex overflow-hidden rounded-lg border border-edge">
        {BITRATE_OPTIONS.map((rate) => (
          <button
            key={rate}
            onClick={() => onChange({ ...filters, minBitrate: rate })}
            className={cn(
              "h-8 px-3 font-mono text-[11px] uppercase tracking-wider transition-colors",
              filters.minBitrate === rate
                ? "bg-hover text-primary"
                : "text-muted hover:text-secondary"
            )}
          >
            {rate === 0 ? "Any" : `${rate}+`}
          </button>
        ))}
      </div>
    </div>
  );
}
