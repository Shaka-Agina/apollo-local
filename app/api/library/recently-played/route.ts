import { NextRequest, NextResponse } from "next/server";
import { listRecentlyPlayed, recordPlay, type TrackRef } from "@/lib/collections";

// GET /api/library/recently-played
export async function GET() {
  const tracks = await listRecentlyPlayed();
  return NextResponse.json({ tracks });
}

// POST /api/library/recently-played — { track }
export async function POST(req: NextRequest) {
  let body: { track?: TrackRef };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const track = body.track;
  if (!track?.file?.trim() || !track.title?.trim()) {
    return NextResponse.json({ error: "track required" }, { status: 400 });
  }
  const tracks = await recordPlay({
    file: track.file,
    title: track.title,
    artist: track.artist,
    artwork: track.artwork,
    sizeBytes: track.sizeBytes,
  });
  return NextResponse.json({ tracks });
}
