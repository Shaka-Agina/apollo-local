// Server-side only. slskd always saves downloads to
// <downloads>/<last remote folder segment>/ — there is no per-download
// destination. To support custom folder names, Apollo records the desired
// name at enqueue time and renames the local folder once every file in the
// group has finished transferring.

import { promises as fs } from "fs";
import path from "path";
import type { TransferUserGroup } from "./types";
import { bucketForState } from "./types";

const STORE_PATH = path.join(
  process.env.APOLLO_DATA_DIR || process.cwd(),
  ".apollo-renames.json"
);

export interface PendingRename {
  username: string;
  /** Full remote directory path, backslash-separated. */
  remoteDir: string;
  /** Desired local folder name. */
  targetName: string;
  createdAt: string;
}

async function readStore(): Promise<PendingRename[]> {
  return fs
    .readFile(STORE_PATH, "utf8")
    .then((raw) => JSON.parse(raw) as PendingRename[])
    .catch(() => []);
}

async function writeStore(entries: PendingRename[]): Promise<void> {
  if (entries.length === 0) {
    await fs.rm(STORE_PATH, { force: true }).catch(() => null);
    return;
  }
  await fs.writeFile(STORE_PATH, JSON.stringify(entries, null, 2), "utf8");
}

function sanitizeFolderName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

export async function addPendingRename(entry: {
  username: string;
  remoteDir: string;
  targetName: string;
}): Promise<void> {
  const target = sanitizeFolderName(entry.targetName);
  const defaultName = entry.remoteDir.split(/[\\/]/).pop() ?? "";
  if (!target || target === defaultName) return; // nothing to do

  const store = await readStore();
  const filtered = store.filter(
    (e) => !(e.username === entry.username && e.remoteDir === entry.remoteDir)
  );
  filtered.push({
    username: entry.username,
    remoteDir: entry.remoteDir,
    targetName: target,
    createdAt: new Date().toISOString(),
  });
  await writeStore(filtered);
}

/** Moves the contents of src into dest (used when dest already exists). */
async function mergeInto(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  for (const item of await fs.readdir(src)) {
    await fs.rename(path.join(src, item), path.join(dest, item));
  }
  await fs.rmdir(src).catch(() => null);
}

/**
 * Applies any pending renames whose transfer groups have finished.
 * Called from the transfers polling route, so it runs continuously
 * while anyone has the queue open.
 */
export async function applyPendingRenames(
  groups: TransferUserGroup[],
  downloadsDir: string
): Promise<void> {
  const store = await readStore();
  if (store.length === 0) return;

  const remaining: PendingRename[] = [];

  for (const entry of store) {
    const files = groups
      .filter((g) => g.username === entry.username)
      .flatMap((g) => g.directories ?? [])
      .filter((d) => d.directory === entry.remoteDir)
      .flatMap((d) => d.files ?? []);

    const stillMoving = files.some((f) =>
      ["queued", "initializing", "inProgress"].includes(bucketForState(f.state))
    );
    if (stillMoving) {
      remaining.push(entry);
      continue;
    }

    const defaultName = entry.remoteDir.split(/[\\/]/).pop() ?? "";
    const src = path.join(downloadsDir, defaultName);
    const dest = path.join(downloadsDir, entry.targetName);

    const srcExists = await fs
      .stat(src)
      .then((s) => s.isDirectory())
      .catch(() => false);

    if (!srcExists) {
      // Nothing to rename (already renamed, cleared, or nothing succeeded).
      continue;
    }

    try {
      const destExists = await fs
        .stat(dest)
        .then(() => true)
        .catch(() => false);
      if (destExists) {
        await mergeInto(src, dest);
      } else {
        await fs.rename(src, dest);
      }
    } catch {
      // Transient error (file lock etc.) — retry on the next poll.
      remaining.push(entry);
    }
  }

  if (remaining.length !== store.length) {
    await writeStore(remaining);
  } else if (remaining.some((r, i) => r !== store[i])) {
    await writeStore(remaining);
  }
}
