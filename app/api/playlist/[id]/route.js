// app/api/playlist/[id]/route.js
import { NextResponse } from "next/server";
import { oldDB, newDB } from "../../../lib/mongodb";
import { OldPlaylist } from "../../../models/Playlist";
import NewPlaylist from "../../../models/Playlist";

export async function GET(req, { params }) {
  try {
    await Promise.all([oldDB, newDB]);
    let playlist = await OldPlaylist.findById(params.id).populate("songs");
    if (!playlist) {
      playlist = await NewPlaylist.findById(params.id).populate("songs");
    }
    return NextResponse.json({ playlist });
  } catch (error) {
    console.error(`Error fetching playlist with id ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch playlist" },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  const { id } = params;
  const body = await req.json();
  const { action, songId, keyword } = body;

  if (action !== "add_song") {
    return NextResponse.json({ message: "Invalid action." }, { status: 400 });
  }

  if (process.env.ADD_TO_PLAYLIST_KEYWORD !== keyword) {
    return NextResponse.json({ message: "Invalid keyword." }, { status: 401 });
  }

  try {
    await Promise.all([oldDB, newDB]);

    let playlistToUpdate = await NewPlaylist.findById(id);

    // If not found in the new DB, try the old one
    if (!playlistToUpdate) {
      playlistToUpdate = await OldPlaylist.findById(id);
    }

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

