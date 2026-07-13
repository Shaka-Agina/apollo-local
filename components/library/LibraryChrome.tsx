"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { audioUrl } from "@/hooks/useDownloads";
import { useUiPrefs } from "@/components/prefs/UiPrefsProvider";

export type LibraryFilter = "albums" | "artists" | "liked";
export type LibrarySort = "recent" | "name";

/** Fallback static class when prefs aren't mounted (SSR). */
export const ALBUM_GRID_CLASS =
  "grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4";

export function useAlbumGridStyle(): React.CSSProperties {
  const { prefs } = useUiPrefs();
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () => setDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const cols = desktop ? prefs.desktopGridCols : prefs.mobileGridCols;
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gap: desktop ? "1rem" : "0.75rem",
  };
}

export function Artwork({
  cover,
  name,
  className,
}: {
  cover: string | null;
  name: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden bg-elevated",
        className
      )}
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={audioUrl(cover)}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="select-none font-mono text-2xl font-bold text-muted">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export function StickyLibraryChrome({
  filter,
  onFilter,
  sort,
  onSort,
  search,
  onSearch,
  showSearch,
  onToggleSearch,
}: {
  filter: LibraryFilter;
  onFilter: (f: LibraryFilter) => void;
  sort: LibrarySort;
  onSort: (s: LibrarySort) => void;
  search: string;
  onSearch: (q: string) => void;
  showSearch: boolean;
  onToggleSearch: () => void;
}) {
  const pills: { id: LibraryFilter; label: string }[] = [
    { id: "albums", label: "Albums" },
    { id: "artists", label: "Artists" },
    { id: "liked", label: "Liked" },
  ];

  return (
    <div className="sticky top-0 z-20 -mx-4 space-y-3 bg-base px-4 pb-3 pt-1 shadow-[0_1px_0_0_var(--border)] sm:-mx-6 sm:px-6">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 overflow-hidden rounded-lg border border-edge">
          {pills.map((p) => (
            <button
              key={p.id}
              onClick={() => onFilter(p.id)}
              className={cn(
                "h-10 flex-1 font-mono text-[11px] uppercase tracking-widest transition-colors",
                filter === p.id
                  ? "bg-hover text-primary"
                  : "text-muted hover:text-secondary"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={onToggleSearch}
          aria-label="Search"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-edge text-secondary hover:bg-hover hover:text-primary"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" />
          </svg>
        </button>
      </div>

      {showSearch && (
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search your music"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          className="h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-primary placeholder:text-muted focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
        />
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => onSort(sort === "recent" ? "name" : "recent")}
          className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-secondary hover:text-primary"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M8 6v12M8 6l-3 3M8 6l3 3M16 18V6M16 18l-3-3M16 18l3-3" />
          </svg>
          {sort === "recent" ? "Recents" : "Name"}
        </button>
      </div>
    </div>
  );
}

export function AlbumGridCard({
  title,
  subtitle,
  cover,
  onClick,
}: {
  title: string;
  subtitle: string;
  cover: string | null;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex h-full w-full flex-col text-left"
    >
      <Artwork
        cover={cover}
        name={title}
        className="aspect-square w-full shrink-0 rounded-md shadow-sm transition-opacity group-hover:opacity-90"
      />
      {/* Fixed text block so long titles don't stretch the row */}
      <div className="mt-2 flex h-[3.25rem] flex-col overflow-hidden">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-primary">
          {title}
        </p>
        <p className="mt-0.5 truncate text-[12px] leading-tight text-secondary">
          {subtitle}
        </p>
      </div>
    </button>
  );
}

/** Grid that respects Appearance → column prefs. */
export function AlbumGrid({ children }: { children: React.ReactNode }) {
  const style = useAlbumGridStyle();
  return <div style={style}>{children}</div>;
}
