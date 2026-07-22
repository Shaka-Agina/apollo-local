/** Streaming quality modes — client prefs + /api/audio query. */

export type StreamQuality = "data-saver" | "original";

/** Opus bitrate used for data-saver transcodes (kbps). */
export const DATA_SAVER_BITRATE_KBPS = 96;

/** Formats that should be transcoded in data-saver mode. */
const TRANSCODE_EXT = new Set(["flac", "wav", "aiff", "wma"]);

export function shouldTranscode(ext: string, quality: StreamQuality): boolean {
  return quality === "data-saver" && TRANSCODE_EXT.has(ext.toLowerCase());
}

/** Rough download size for a data-saver stream given duration in seconds. */
export function estimateDataSaverBytes(durationSeconds: number): number {
  if (!durationSeconds || durationSeconds <= 0) return 0;
  return Math.round((durationSeconds * DATA_SAVER_BITRATE_KBPS * 1000) / 8);
}

export function parseStreamQuality(raw: string | null | undefined): StreamQuality {
  return raw === "original" ? "original" : "data-saver";
}
