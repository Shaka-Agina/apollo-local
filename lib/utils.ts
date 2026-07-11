import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  if (!bytesPerSecond || bytesPerSecond <= 0) return "—";
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatDuration(seconds?: number): string {
  if (seconds == null || !isFinite(seconds) || seconds < 0) return "—";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function etaSeconds(bytesRemaining: number, speed: number): number | undefined {
  if (!speed || speed <= 0) return undefined;
  return bytesRemaining / speed;
}

/** Last path segment of a Soulseek filename (they use backslashes). */
export function baseName(filename: string): string {
  const parts = filename.split(/[\\/]/);
  return parts[parts.length - 1] || filename;
}

/** Parent folder of a Soulseek filename. */
export function parentFolder(filename: string): string {
  const parts = filename.split(/[\\/]/);
  return parts.length > 1 ? parts[parts.length - 2] : "";
}

export function fileExtension(filename: string): string {
  const base = baseName(filename);
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
}
