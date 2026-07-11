// Server-side only. Reads and updates the slskd.yml config file directly.
// slskd watches its config file and hot-reloads most options, including
// the download directories — no restart needed.

import { promises as fs } from "fs";
import path from "path";
import YAML from "yaml";

const CONFIG_PATH = process.env.SLSKD_CONFIG_PATH ?? "";

export function configPathConfigured(): boolean {
  return !!CONFIG_PATH;
}

async function readConfig(): Promise<{ raw: string; doc: YAML.Document }> {
  const raw = await fs.readFile(CONFIG_PATH, "utf8");
  // Parse as a Document to preserve comments and formatting on write.
  const doc = YAML.parseDocument(raw);
  return { raw, doc };
}

export interface DirectorySettings {
  downloads: string | null;
  incomplete: string | null;
}

export async function getDirectories(): Promise<DirectorySettings> {
  const { doc } = await readConfig();
  return {
    downloads: (doc.getIn(["directories", "downloads"]) as string) ?? null,
    incomplete: (doc.getIn(["directories", "incomplete"]) as string) ?? null,
  };
}

export async function setDirectories(update: {
  downloads?: string;
  incomplete?: string;
}): Promise<DirectorySettings> {
  for (const value of [update.downloads, update.incomplete]) {
    if (value !== undefined) {
      if (!path.isAbsolute(value)) {
        throw new Error(`Path must be absolute: ${value}`);
      }
      // Create the folder if it doesn't exist so slskd can write to it.
      await fs.mkdir(value, { recursive: true });
    }
  }

  const { doc } = await readConfig();

  if (update.downloads !== undefined) {
    doc.setIn(["directories", "downloads"], update.downloads);
  }
  if (update.incomplete !== undefined) {
    doc.setIn(["directories", "incomplete"], update.incomplete);
  }

  // Back up before writing, mirroring slskd's own remote-config behaviour.
  await fs.copyFile(CONFIG_PATH, `${CONFIG_PATH}.bak`).catch(() => null);
  await fs.writeFile(CONFIG_PATH, doc.toString(), "utf8");

  return getDirectories();
}

// The Soulseek network authenticates with the actual password, so slskd
// requires it in plaintext in slskd.yml — it cannot be hashed at rest.
// Apollo treats it as write-only: it is never read back out of the config
// and never returned by any API route.
export async function getSoulseekAccount(): Promise<{
  username: string | null;
  hasPassword: boolean;
}> {
  const { doc } = await readConfig();
  return {
    username: (doc.getIn(["soulseek", "username"]) as string) ?? null,
    hasPassword: !!doc.getIn(["soulseek", "password"]),
  };
}

export async function setSoulseekCredentials(update: {
  username: string;
  password?: string;
}): Promise<void> {
  const { doc } = await readConfig();

  doc.setIn(["soulseek", "username"], update.username);
  if (update.password) {
    doc.setIn(["soulseek", "password"], update.password);
  }

  await fs.copyFile(CONFIG_PATH, `${CONFIG_PATH}.bak`).catch(() => null);
  await fs.writeFile(CONFIG_PATH, doc.toString(), "utf8");
}

// Sharing toggle. slskd has no enable/disable flag for shares, so "off" means
// emptying shares.directories. The previous list is stashed in a sidecar file
// so it can be restored when sharing is turned back on.
const SHARES_STASH_PATH = () => `${CONFIG_PATH}.shares-stash.json`;

export interface SharingState {
  enabled: boolean;
  directories: string[];
}

export async function getSharing(): Promise<SharingState> {
  const { doc } = await readConfig();
  const node = doc.getIn(["shares", "directories"]);
  const current = (YAML.isCollection(node) ? node.toJSON() : []) as string[];

  if (current.length > 0) {
    return { enabled: true, directories: current };
  }

  const stashed = await fs
    .readFile(SHARES_STASH_PATH(), "utf8")
    .then((raw) => JSON.parse(raw) as string[])
    .catch(() => []);
  return { enabled: false, directories: stashed };
}

export async function setSharingEnabled(enabled: boolean): Promise<SharingState> {
  const state = await getSharing();
  if (state.enabled === enabled) return state;

  const { doc } = await readConfig();

  if (enabled) {
    if (state.directories.length === 0) {
      throw new Error("No shared folders configured to re-enable");
    }
    doc.setIn(["shares", "directories"], state.directories);
    await fs.rm(SHARES_STASH_PATH(), { force: true }).catch(() => null);
  } else {
    await fs.writeFile(
      SHARES_STASH_PATH(),
      JSON.stringify(state.directories),
      "utf8"
    );
    doc.setIn(["shares", "directories"], []);
  }

  await fs.copyFile(CONFIG_PATH, `${CONFIG_PATH}.bak`).catch(() => null);
  await fs.writeFile(CONFIG_PATH, doc.toString(), "utf8");

  return getSharing();
}
