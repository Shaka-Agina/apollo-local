import { NextRequest, NextResponse } from "next/server";
import {
  configPathConfigured,
  getSoulseekAccount,
  setSoulseekCredentials,
} from "@/lib/slskd-config";
import { slskd } from "@/lib/slskd";

// GET /api/settings/credentials — username and whether a password is set.
// The password itself is never returned.
export async function GET() {
  if (!configPathConfigured()) {
    return NextResponse.json(
      { error: "SLSKD_CONFIG_PATH is not set in .env.local" },
      { status: 400 }
    );
  }

  try {
    const account = await getSoulseekAccount();
    return NextResponse.json(account);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/settings/credentials — update Soulseek login and reconnect.
// body: { username: string, password?: string } (password omitted = keep current)
export async function PUT(req: NextRequest) {
  if (!configPathConfigured()) {
    return NextResponse.json(
      { error: "SLSKD_CONFIG_PATH is not set in .env.local" },
      { status: 400 }
    );
  }

  try {
    const { username, password } = await req.json();
    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }
    if (password !== undefined && typeof password !== "string") {
      return NextResponse.json({ error: "password must be a string" }, { status: 400 });
    }

    await setSoulseekCredentials({ username: username.trim(), password });

    // Give slskd's config watcher a moment to pick up the change, then force
    // a reconnect so the new credentials take effect immediately.
    await new Promise((r) => setTimeout(r, 1500));
    await slskd("/server", {
      method: "DELETE",
      body: JSON.stringify("Reconnecting with new credentials"),
    }).catch(() => null);
    await slskd("/server", { method: "PUT" }).catch(() => null);

    const account = await getSoulseekAccount();
    return NextResponse.json(account);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
