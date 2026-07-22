import { spawn } from "child_process";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { DATA_SAVER_BITRATE_KBPS } from "./stream-quality";

const inflight = new Map<string, Promise<string>>();

function cacheDir(): string {
  return path.join(process.env.APOLLO_DATA_DIR || process.cwd(), "transcode");
}

function cacheKey(localPath: string, mtimeMs: number): string {
  return createHash("sha1")
    .update(`${localPath}|${mtimeMs}|opus${DATA_SAVER_BITRATE_KBPS}`)
    .digest("hex");
}

export async function ffmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("ffmpeg", ["-version"], {
      stdio: ["ignore", "ignore", "ignore"],
    });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

/**
 * Ensure a data-saver Opus/Ogg cache exists for `localPath`.
 * Returns the absolute path to the cached file.
 */
export async function ensureDataSaverCache(
  localPath: string,
  mtimeMs: number
): Promise<string> {
  const key = cacheKey(localPath, mtimeMs);
  const outPath = path.join(cacheDir(), `${key}.ogg`);

  const existing = await fs.stat(outPath).catch(() => null);
  if (existing?.isFile() && existing.size > 0) return outPath;

  const pending = inflight.get(key);
  if (pending) return pending;

  const job = (async () => {
    await fs.mkdir(cacheDir(), { recursive: true });
    const tmpPath = `${outPath}.tmp`;

    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        "ffmpeg",
        [
          "-y",
          "-i",
          localPath,
          "-vn",
          "-c:a",
          "libopus",
          "-b:a",
          `${DATA_SAVER_BITRATE_KBPS}k`,
          "-f",
          "ogg",
          tmpPath,
        ],
        { stdio: ["ignore", "ignore", "pipe"] }
      );
      let stderr = "";
      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
        if (stderr.length > 4000) stderr = stderr.slice(-2000);
      });
      child.on("error", (err) => reject(err));
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited ${code}: ${stderr.trim()}`));
      });
    });

    await fs.rename(tmpPath, outPath).catch(async () => {
      await fs.copyFile(tmpPath, outPath);
      await fs.unlink(tmpPath).catch(() => {});
    });
    return outPath;
  })();

  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}
