// app/api/playlists/route.js
import { NextResponse } from "next/server";
import connectDB from "../../lib/mongodb";
import Playlist from "../../models/Playlist";

export async function GET() {
  try {
    await connectDB();

    const playlists = await Playlist.find().populate("songs");
    return NextResponse.json({ playlists });
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch playlists" },
      { status: 500 }
    );
  }
}
