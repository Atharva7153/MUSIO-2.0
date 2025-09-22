// app/api/upload/route.js
import { NextResponse } from "next/server";
import connectDB from "../../lib/mongodb";
import Song from "../../models/Song";
import Playlist from "../../models/Playlist";
import { v2 as cloudinary } from "cloudinary";

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// helper: convert File -> Buffer
async function fileToBuffer(file) {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// helper: upload buffer -> Cloudinary
function uploadToCloudinary(fileBuffer, folder, resource_type = "auto") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
}

export async function POST(req) {
  try {
    await connectDB();

    const formData = await req.formData();

    // Song data
    const title = formData.get("title");
    const artist = formData.get("artist");
    const genre = formData.get("genre");
    const playlistId = formData.get("playlistId"); // "existing" or "new"
    const newPlaylistName = formData.get("newPlaylistName");

    // Files
    const songFile = formData.get("songFile");
    const songCover = formData.get("songCover");
    const playlistCover = formData.get("playlistCover");

    // Upload song file
    let songUpload;
    if (songFile) {
      const songBuffer = await fileToBuffer(songFile);
      songUpload = await uploadToCloudinary(songBuffer, "songs", "auto");
    }

    // Upload song cover
    let songCoverUrl = "";
    if (songCover) {
      const coverBuffer = await fileToBuffer(songCover);
      const coverUpload = await uploadToCloudinary(coverBuffer, "song_covers", "image");
      songCoverUrl = coverUpload.secure_url;
    }

    // Save Song
    const newSong = await Song.create({
      title,
      artist,
      genre: genre || 'Unknown',
      url: songUpload?.secure_url,
      coverImage: songCoverUrl,
    });

    let playlist;

    // Add to existing playlist
    if (playlistId && playlistId !== "new") {
      playlist = await Playlist.findById(playlistId);
      playlist.songs.push(newSong._id);
      await playlist.save();
    }
    // Or create new playlist
    else if (newPlaylistName) {
      let playlistCoverUrl = "";
      if (playlistCover) {
        const playlistBuffer = await fileToBuffer(playlistCover);
        const playlistCoverUpload = await uploadToCloudinary(playlistBuffer, "playlist_covers", "image");
        playlistCoverUrl = playlistCoverUpload.secure_url;
      }

      playlist = await Playlist.create({
        name: newPlaylistName,
        coverImage: playlistCoverUrl,
        songs: [newSong._id],
      });
    }

    return NextResponse.json({ success: true, song: newSong, playlist });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
