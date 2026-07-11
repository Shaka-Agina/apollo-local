import { NextRequest, NextResponse } from "next/server";
import { slskd, SlskdError } from "@/lib/slskd";
import type { Share, ShareDirectory } from "@/lib/types";

function errorResponse(err: unknown) {
  const status = err instanceof SlskdError ? err.status : 502;
  const message = err instanceof Error ? err.message : "Unknown error";
  return NextResponse.json({ error: message }, { status });
}

// GET /api/shares            — list configured shares
// GET /api/shares?id={id}    — list directories/files within one share
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");

    if (id) {
      const contents = await slskd<ShareDirectory[]>(
        `/shares/${encodeURIComponent(id)}/contents`
      );
      return NextResponse.json(contents);
    }

    // slskd returns shares grouped by host, e.g. { local: Share[] } —
    // flatten to a single array for the UI.
    const byHost = await slskd<Record<string, Share[]>>("/shares");
    const shares = Object.values(byHost ?? {}).flat();
    return NextResponse.json(shares);
  } catch (err) {
    return errorResponse(err);
  }
}
