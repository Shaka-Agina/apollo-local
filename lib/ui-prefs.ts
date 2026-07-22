/** Client UI preferences — stored per browser/device in localStorage. */

import type { StreamQuality } from "./stream-quality";

export type LibraryFilter = "albums" | "artists" | "liked" | "playlists";
export type LibrarySort = "recent" | "name" | "played";

export interface UiPrefs {
  /** Album columns on phones (< sm). */
  mobileGridCols: number;
  /** Album columns on tablet/desktop (≥ sm). */
  desktopGridCols: number;

  /** Mini player chrome (defaults = minimal). */
  miniShowProgress: boolean;
  miniShowPrevNext: boolean;
  miniShowQueue: boolean;
  miniShowShuffle: boolean;
  miniShowRepeat: boolean;
  miniShowClose: boolean;
  miniShowTime: boolean;

  /**
   * Full-player “tap artwork” focus mode.
   * When focused, chrome can hide and the album recenters.
   */
  focusHideTabBar: boolean;
  focusHideChrome: boolean;
  focusShowClock: boolean;
  focusShowTransport: boolean;
  focusShowProgress: boolean;
  focusShowTimes: boolean;
  focusShowTitle: boolean;

  /** When true, hide per-track file sizes in album track lists. Default off. */
  hideTrackFileSize: boolean;

  /**
   * Streaming quality over the network.
   * data-saver (default): transcode lossless to Opus ~96 kbps.
   * original: stream the file as stored.
   */
  streamQuality: StreamQuality;

  /** Listen / Library chrome — sticky across visits. */
  libraryFilter: LibraryFilter;
  librarySort: LibrarySort;
  libraryShowSearch: boolean;
  librarySearch: string;
}

export const UI_PREFS_KEY = "apollo-ui-prefs";

export const DEFAULT_UI_PREFS: UiPrefs = {
  mobileGridCols: 3,
  desktopGridCols: 6,

  miniShowProgress: true,
  miniShowPrevNext: false,
  miniShowQueue: false,
  miniShowShuffle: false,
  miniShowRepeat: true,
  miniShowClose: false,
  miniShowTime: false,

  focusHideTabBar: true,
  focusHideChrome: true,
  focusShowClock: false,
  focusShowTransport: false,
  focusShowProgress: false,
  focusShowTimes: false,
  focusShowTitle: false,

  hideTrackFileSize: false,

  streamQuality: "data-saver",

  libraryFilter: "albums",
  librarySort: "recent",
  libraryShowSearch: false,
  librarySearch: "",
};

export const GRID_COLS = {
  mobile: { min: 2, max: 5 },
  desktop: { min: 3, max: 10 },
} as const;

const LIBRARY_FILTERS: LibraryFilter[] = [
  "albums",
  "artists",
  "liked",
  "playlists",
];
const LIBRARY_SORTS: LibrarySort[] = ["recent", "name", "played"];

export function clampGridCols(
  value: number,
  kind: "mobile" | "desktop"
): number {
  const { min, max } = GRID_COLS[kind];
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function mergeUiPrefs(partial: Partial<UiPrefs> | null | undefined): UiPrefs {
  const base = { ...DEFAULT_UI_PREFS, ...(partial ?? {}) };
  const streamQuality =
    base.streamQuality === "original" ? "original" : "data-saver";
  // Migrate removed "played" tab → albums.
  const rawFilter = base.libraryFilter as string;
  const libraryFilter = LIBRARY_FILTERS.includes(rawFilter as LibraryFilter)
    ? (rawFilter as LibraryFilter)
    : DEFAULT_UI_PREFS.libraryFilter;
  const librarySort = LIBRARY_SORTS.includes(base.librarySort)
    ? base.librarySort
    : DEFAULT_UI_PREFS.librarySort;
  return {
    ...base,
    mobileGridCols: clampGridCols(base.mobileGridCols, "mobile"),
    desktopGridCols: clampGridCols(base.desktopGridCols, "desktop"),
    streamQuality,
    libraryFilter,
    librarySort,
    libraryShowSearch: !!base.libraryShowSearch,
    librarySearch: typeof base.librarySearch === "string" ? base.librarySearch : "",
    hideTrackFileSize: !!base.hideTrackFileSize,
  };
}

export function readUiPrefsFromStorage(): UiPrefs {
  if (typeof window === "undefined") return DEFAULT_UI_PREFS;
  try {
    const raw = window.localStorage.getItem(UI_PREFS_KEY);
    if (!raw) return DEFAULT_UI_PREFS;
    return mergeUiPrefs(JSON.parse(raw) as Partial<UiPrefs>);
  } catch {
    return DEFAULT_UI_PREFS;
  }
}

export function writeUiPrefsToStorage(prefs: UiPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* quota / private mode */
  }
}
