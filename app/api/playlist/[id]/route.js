// app/api/playlist/[id]/route.js
import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongodb";
import Playlist from "../../../models/Playlist";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const playlist = await Playlist.findById(id).populate("songs");
    return NextResponse.json({ playlist });
  } catch (error) {
    const { id } = await params;
    console.error(`Error fetching playlist with id ${id}:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch playlist" },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  const { id } = await params;
  const body = await req.json();
  const { action, songId, keyword } = body;

  if (action !== "add_song") {
    return NextResponse.json({ message: "Invalid action." }, { status: 400 });
  }

  if (process.env.ADD_TO_PLAYLIST_KEYWORD !== keyword) {
    return NextResponse.json({ message: "Invalid keyword." }, { status: 401 });
  }

  try {
    await connectDB();

    const playlistToUpdate = await Playlist.findById(id);

    if (!playlistToUpdate) {
      return NextResponse.json(
        { message: "Playlist not found." },
        { status: 404 }
      );
    }

    // Check if the song is already in the playlist
    if (playlistToUpdate.songs.includes(songId)) {
      return NextResponse.json(
        { message: "Song is already in this playlist." },
        { status: 409 }
      );
    }

    playlistToUpdate.songs.push(songId);
    await playlistToUpdate.save();

    return NextResponse.json({ playlist: playlistToUpdate });
  } catch (error) {
    console.error("Error adding song to playlist:", error);
    return NextResponse.json(
      { message: "Server error while adding song." },
      { status: 500 }
    );
  }
}
