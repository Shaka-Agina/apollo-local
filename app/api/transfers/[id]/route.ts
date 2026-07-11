import { NextRequest, NextResponse } from "next/server";
import { slskd, SlskdError } from "@/lib/slskd";

function errorResponse(err: unknown) {
  const status = err instanceof SlskdError ? err.status : 502;
  const message = err instanceof Error ? err.message : "Unknown error";
  return NextResponse.json({ error: message }, { status });
}

// DELETE /api/transfers/{id}?username={username}&remove={bool}
// Cancels a download; remove=true also clears it from the list.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const username = req.nextUrl.searchParams.get("username");
    const remove = req.nextUrl.searchParams.get("remove") === "true";
    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }

    await slskd(
      `/transfers/downloads/${encodeURIComponent(username)}/${encodeURIComponent(
        params.id
      )}?remove=${remove}`,
      { method: "DELETE" }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

// PUT /api/transfers/{id} — retry a failed download.
// slskd has no native retry: we remove the errored record and re-enqueue.
// body: { username: string, filename: string, size: number }
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { username, filename, size } = await req.json();
    if (!username || !filename) {
      return NextResponse.json(
        { error: "username and filename are required" },
        { status: 400 }
      );
    }

    // Clear the old record first (ignore failure — it may already be gone).
    await slskd(
      `/transfers/downloads/${encodeURIComponent(username)}/${encodeURIComponent(
        params.id
      )}?remove=true`,
      { method: "DELETE" }
    ).catch(() => null);

    await slskd(`/transfers/downloads/${encodeURIComponent(username)}`, {
      method: "POST",
      body: JSON.stringify([{ filename, size }]),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
