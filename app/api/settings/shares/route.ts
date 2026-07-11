import { NextRequest, NextResponse } from "next/server";
import {
  configPathConfigured,
  getSharing,
  setSharingEnabled,
} from "@/lib/slskd-config";

function notConfigured() {
  return NextResponse.json(
    { error: "SLSKD_CONFIG_PATH is not set in .env.local" },
    { status: 400 }
  );
}

// GET /api/settings/shares — whether sharing is on and which folders
export async function GET() {
  if (!configPathConfigured()) return notConfigured();

  try {
    const state = await getSharing();
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/settings/shares — body: { enabled: boolean }
export async function PUT(req: NextRequest) {
  if (!configPathConfigured()) return notConfigured();

  try {
    const { enabled } = await req.json();
    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
    }

    const state = await setSharingEnabled(enabled);
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
