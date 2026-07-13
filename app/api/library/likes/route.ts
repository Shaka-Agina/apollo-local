import { NextRequest, NextResponse } from "next/server";
import {
  listLikes,
  setLiked,
  toggleLike,
  type TrackRef,
} from "@/lib/collections";

// GET /api/library/likes — newest liked first
export async function GET() {
  const likes = await listLikes();
  return NextResponse.json({ likes });
}

// POST /api/library/likes — { track, liked?: boolean } or toggle when liked omitted
export async function POST(req: NextRequest) {
  let body: { track?: TrackRef; liked?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const track = body.track;
  if (!track?.file || !track?.title) {
    return NextResponse.json(
      { error: "track.file and track.title required" },
      { status: 400 }
    );
  }

  if (typeof body.liked === "boolean") {
    const likes = await setLiked(track, body.liked);
    return NextResponse.json({ liked: body.liked, likes });
  }

  const result = await toggleLike(track);
  return NextResponse.json(result);
}
