import { NextResponse } from "next/server";
import { slskd, SlskdError } from "@/lib/slskd";
import type { ApplicationState } from "@/lib/types";

// GET /api/application — slskd + Soulseek server status
export async function GET() {
  try {
    const state = await slskd<ApplicationState>("/application");
    return NextResponse.json(state);
  } catch (err) {
    const status = err instanceof SlskdError ? err.status : 502;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status });
  }
}
