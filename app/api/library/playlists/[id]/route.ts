import { NextRequest, NextResponse } from "next/server";
import {
  addTrackToPlaylist,
  deletePlaylist,
  getPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
  updatePlaylist,
  type TrackRef,
} from "@/lib/collections";

type Ctx = { params: { id: string } };

function parseTrack(body: unknown): TrackRef | null {
  if (!body || typeof body !== "object") return null;
  const t = body as Record<string, unknown>;
  if (typeof t.file !== "string" || !t.file.trim()) return null;
  if (typeof t.title !== "string" || !t.title.trim()) return null;
  return {
    file: t.file,
    title: t.title,
    artist: typeof t.artist === "string" ? t.artist : undefined,
    artwork: typeof t.artwork === "string" ? t.artwork : undefined,
    sizeBytes: typeof t.sizeBytes === "number" ? t.sizeBytes : undefined,
  };
}

// GET /api/library/playlists/:id
export async function GET(_req: NextRequest, { params }: Ctx) {
  const playlist = await getPlaylist(params.id);
  if (!playlist) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ playlist });
}

// PATCH /api/library/playlists/:id
// { name?, description?, addTrack?, removeFile?, reorder?: string[] }
export async function PATCH(req: NextRequest, { params }: Ctx) {
  let body: {
    name?: string;
    description?: string | null;
    addTrack?: unknown;
    removeFile?: string;
    reorder?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.addTrack) {
    const track = parseTrack(body.addTrack);
    if (!track) {
      return NextResponse.json({ error: "Invalid track" }, { status: 400 });
    }
    const playlist = await addTrackToPlaylist(params.id, track);
    if (!playlist) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ playlist });
  }

  if (body.removeFile) {
    const playlist = await removeTrackFromPlaylist(params.id, body.removeFile);
    if (!playlist) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ playlist });
  }

  if (Array.isArray(body.reorder)) {
    const playlist = await reorderPlaylistTracks(params.id, body.reorder);
    if (!playlist) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ playlist });
  }

  if (body.name != null || body.description !== undefined) {
    const playlist = await updatePlaylist(params.id, {
      name: body.name,
      description: body.description,
    });
    if (!playlist) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ playlist });
  }

  return NextResponse.json({ error: "No changes" }, { status: 400 });
}

// DELETE /api/library/playlists/:id
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const ok = await deletePlaylist(params.id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
