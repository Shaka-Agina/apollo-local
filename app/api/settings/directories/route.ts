import { NextRequest, NextResponse } from "next/server";
import {
  configPathConfigured,
  getDirectories,
  setDirectories,
} from "@/lib/slskd-config";
import { slskd } from "@/lib/slskd";

// GET /api/settings/directories — current download/incomplete folders.
// Reads from the slskd API (effective values), falls back to the yml file.
export async function GET() {
  try {
    const options = await slskd<{
      directories?: { downloads?: string; incomplete?: string };
    }>("/options");
    return NextResponse.json({
      downloads: options.directories?.downloads ?? null,
      incomplete: options.directories?.incomplete ?? null,
      editable: configPathConfigured(),
    });
  } catch {
    if (!configPathConfigured()) {
      return NextResponse.json(
        { error: "slskd unreachable and SLSKD_CONFIG_PATH not set" },
        { status: 502 }
      );
    }
    const dirs = await getDirectories();
    return NextResponse.json({ ...dirs, editable: true });
  }
}

// PUT /api/settings/directories — update folders in slskd.yml
// body: { downloads?: string, incomplete?: string }
export async function PUT(req: NextRequest) {
  if (!configPathConfigured()) {
    return NextResponse.json(
      { error: "SLSKD_CONFIG_PATH is not set in .env.local" },
      { status: 400 }
    );
  }

  try {
    const { downloads, incomplete } = await req.json();
    if (downloads === undefined && incomplete === undefined) {
      return NextResponse.json(
        { error: "Provide downloads and/or incomplete path" },
        { status: 400 }
      );
    }

    const dirs = await setDirectories({ downloads, incomplete });
    return NextResponse.json({ ...dirs, editable: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
