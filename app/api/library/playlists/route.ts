import { NextRequest, NextResponse } from "next/server";
import { createPlaylist, listPlaylists } from "@/lib/collections";

// GET /api/library/playlists
export async function GET() {
  const playlists = await listPlaylists();
  return NextResponse.json({ playlists });
}

// POST /api/library/playlists — { name, description? }
export async function POST(req: NextRequest) {
  let body: { name?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const playlist = await createPlaylist({
    name: body.name,
    description: body.description,
  });
  return NextResponse.json({ playlist }, { status: 201 });
}
