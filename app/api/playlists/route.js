// app/api/playlists/route.js
import { NextResponse } from "next/server";
import { oldDB, newDB } from "../../lib/mongodb";
import { OldPlaylist } from "../../models/Playlist";
import NewPlaylist from "../../models/Playlist";

export async function GET() {
  try {
    await Promise.all([oldDB, newDB]);
    const oldPlaylists = await OldPlaylist.find().populate("songs");
    const newPlaylists = await NewPlaylist.find().populate("songs");
    const playlists = [...oldPlaylists, ...newPlaylists];
    return NextResponse.json({ playlists });
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch playlists" },
      { status: 500 }
    );
  }
}
