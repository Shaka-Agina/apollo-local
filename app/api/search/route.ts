import { NextRequest, NextResponse } from "next/server";
import { slskd, SlskdError } from "@/lib/slskd";
import type { SearchState } from "@/lib/types";

function errorResponse(err: unknown) {
  const status = err instanceof SlskdError ? err.status : 502;
  const message = err instanceof Error ? err.message : "Unknown error";
  return NextResponse.json({ error: message }, { status });
}

// POST /api/search — start a new search
export async function POST(req: NextRequest) {
  try {
    const { searchText } = await req.json();
    if (!searchText || typeof searchText !== "string") {
      return NextResponse.json({ error: "searchText is required" }, { status: 400 });
    }

    const search = await slskd<SearchState>("/searches", {
      method: "POST",
      body: JSON.stringify({
        searchText,
        fileLimit: 10000,
        // filterResponses drops all results when no response filters are
        // configured in slskd — filtering is done client-side instead.
        filterResponses: false,
        searchTimeout: 15000,
      }),
    });

    return NextResponse.json(search);
  } catch (err) {
    return errorResponse(err);
  }
}

// GET /api/search?id={id} — poll a search, responses included
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const search = await slskd<SearchState>(
      `/searches/${encodeURIComponent(id)}?includeResponses=true`
    );

    return NextResponse.json(search);
  } catch (err) {
    return errorResponse(err);
  }
}
