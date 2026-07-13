import { NextResponse } from "next/server";
import { slskd } from "@/lib/slskd";
import { scanDownloadsLibrary } from "@/lib/local-library";

// GET /api/library/downloads — albums (nested-aware) + root files
export async function GET() {
  let downloadsDir: string | undefined;
  try {
    const options = await slskd<{ directories?: { downloads?: string } }>(
      "/options"
    );
    downloadsDir = options.directories?.downloads;
  } catch {
    return NextResponse.json({ error: "slskd unreachable" }, { status: 502 });
  }
  if (!downloadsDir) {
    return NextResponse.json({ error: "No downloads directory" }, { status: 500 });
  }

  const { folders, rootFiles } = await scanDownloadsLibrary(downloadsDir);
  return NextResponse.json({ downloadsDir, folders, rootFiles });
}
