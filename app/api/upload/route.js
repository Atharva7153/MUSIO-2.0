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
    const artist = formData.get("artist") || "Unknown Artist";
    const genre = formData.get("genre") || "Unknown";
    const playlistId = formData.get("playlistId");
    const newPlaylistName = formData.get("newPlaylistName");

    // Files
    const songFile = formData.get("songFile");
    const songCover = formData.get("songCover");
    const playlistCover = formData.get("playlistCover");

    if (!songFile || songFile.size === 0) {
      return NextResponse.json(
        { success: false, error: "Please select a valid audio file." },
        { status: 400 }
      );
    }

    // 1. Upload files to Cloudinary
    const songBuffer = await fileToBuffer(songFile);
    const songUploadResult = await uploadToCloudinary(
      songBuffer,
      "songs",
      "video"
    );

    let songCoverUploadResult;
    if (songCover && songCover.size > 0) {
      const coverBuffer = await fileToBuffer(songCover);
      songCoverUploadResult = await uploadToCloudinary(
        coverBuffer,
        "song_covers",
        "image"
      );
    }

    // 2. Create the new song in the database
    const newSongData = {
      title,
      artist,
      genre,
      url: songUploadResult.secure_url,
      duration: songUploadResult.duration,
      coverImage: songCoverUploadResult?.secure_url,
    };
    const savedSong = await Song.create(newSongData);

    let finalPlaylist = null;

    // 3. Handle playlist logic
    if (newPlaylistName && newPlaylistName.trim() !== "") {
      let playlistCoverUrl = savedSong.coverImage || "/playlist.png";
      if (playlistCover && playlistCover.size > 0) {
        const plCoverBuffer = await fileToBuffer(playlistCover);
        const plCoverResult = await uploadToCloudinary(
          plCoverBuffer,
          "playlist_covers",
          "image"
        );
        if (plCoverResult?.secure_url) {
          playlistCoverUrl = plCoverResult.secure_url;
        }
      }

      finalPlaylist = await Playlist.create({
        name: newPlaylistName.trim(),
        songs: [savedSong._id],
        coverImage: playlistCoverUrl,
      });
    } else if (playlistId && playlistId !== "new") {
      const playlist = await Playlist.findById(playlistId);
      if (playlist) {
        playlist.songs.push(savedSong._id);
        await playlist.save();
        finalPlaylist = playlist;
      }
    }

    return NextResponse.json({
      success: true,
      song: savedSong,
      playlist: finalPlaylist,
      message: "Song uploaded successfully",
    });
  } catch (error) {
    console.error("Error in upload:", error);
    return NextResponse.json(
      { success: false, error: "Upload failed: " + error.message },
      { status: 500 }
    );
  }
}
