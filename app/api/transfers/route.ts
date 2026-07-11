import { NextRequest, NextResponse } from "next/server";
import { slskd, SlskdError } from "@/lib/slskd";
import type { TransferUserGroup } from "@/lib/types";
import { addPendingRename, applyPendingRenames } from "@/lib/folder-renames";

function errorResponse(err: unknown) {
  const status = err instanceof SlskdError ? err.status : 502;
  const message = err instanceof Error ? err.message : "Unknown error";
  return NextResponse.json({ error: message }, { status });
}

// The downloads directory rarely changes; cache it briefly to avoid an
// extra slskd call on every 2s poll.
let cachedDownloadsDir: { value: string; at: number } | null = null;

async function getDownloadsDir(): Promise<string | null> {
  if (cachedDownloadsDir && Date.now() - cachedDownloadsDir.at < 30_000) {
    return cachedDownloadsDir.value;
  }
  try {
    const options = await slskd<{ directories?: { downloads?: string } }>(
      "/options"
    );
    const dir = options.directories?.downloads ?? null;
    if (dir) cachedDownloadsDir = { value: dir, at: Date.now() };
    return dir;
  } catch {
    return null;
  }
}

// GET /api/transfers — all downloads, grouped by user/directory.
// Also applies any pending custom-folder renames for finished groups.
export async function GET() {
  try {
    const downloads = await slskd<TransferUserGroup[]>("/transfers/downloads");

    const downloadsDir = await getDownloadsDir();
    if (downloadsDir) {
      await applyPendingRenames(downloads, downloadsDir).catch(() => null);
    }

    return NextResponse.json(downloads);
  } catch (err) {
    return errorResponse(err);
  }
}

// POST /api/transfers — queue downloads for a user
// body: { username: string, files: [{ filename, size }], folderName?: string }
// folderName renames the local folder once the whole group completes.
export async function POST(req: NextRequest) {
  try {
    const { username, files, folderName } = await req.json();
    if (!username || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "username and files[] are required" },
        { status: 400 }
      );
    }

    await slskd(`/transfers/downloads/${encodeURIComponent(username)}`, {
      method: "POST",
      body: JSON.stringify(
        files.map((f: { filename: string; size: number }) => ({
          filename: f.filename,
          size: f.size,
        }))
      ),
    });

    if (folderName && typeof folderName === "string") {
      const remoteDir = (files[0].filename as string)
        .split(/[\\/]/)
        .slice(0, -1)
        .join("\\");
      await addPendingRename({ username, remoteDir, targetName: folderName });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
