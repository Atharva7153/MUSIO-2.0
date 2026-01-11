// app/api/upload/route.js
import { NextResponse } from "next/server";
import { oldDB, newDB } from "../../lib/mongodb";
import NewSong, { OldSong } from "../../models/Song";
import NewPlaylist, { OldPlaylist } from "../../models/Playlist";
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
    // Ensure connections are awaited
    await Promise.all([oldDB, newDB]);

    const formData = await req.formData();

    // Song data
    const title = formData.get("title");
    const artist = formData.get("artist");
    const genre = formData.get("genre");
    const playlistId = formData.get("playlistId");
    const newPlaylistName = formData.get("newPlaylistName");

    // Files
    const songFile = formData.get("songFile");
    const songCover = formData.get("songCover");
    const playlistCover = formData.get("playlistCover");

    // 1. Upload files to Cloudinary
    const songBuffer = await fileToBuffer(songFile);
    const songUploadResult = await uploadToCloudinary(songBuffer, "songs", "video");

    let songCoverUploadResult;
    if (songCover && songCover.size > 0) {
        const coverBuffer = await fileToBuffer(songCover);
        songCoverUploadResult = await uploadToCloudinary(coverBuffer, "song_covers", "image");
    }

    // 2. Create the new song in the NEW database
    const newSongData = {
        title,
        artist,
        genre,
        url: songUploadResult.secure_url,
        duration: songUploadResult.duration,
        coverImage: songCoverUploadResult?.secure_url,
    };
    const savedNewSong = await NewSong.create(newSongData);

    let finalSong = savedNewSong;
    let finalPlaylist = null;

    // 3. Handle playlist logic
    if (playlistId) {
        if (playlistId === "new" && newPlaylistName) {
            // Create a new playlist in the NEW database and add the new song
            const newPlaylist = await NewPlaylist.create({
                name: newPlaylistName,
                songs: [savedNewSong._id],
                coverImage: savedNewSong.coverImage || "/playlist.png"
            });
            finalPlaylist = newPlaylist;
        } else if (playlistId !== "new") {
            // Find if the playlist exists in the OLD or NEW database
            let playlist = await OldPlaylist.findById(playlistId);
            let playlistDB = "old";
            if (!playlist) {
                playlist = await NewPlaylist.findById(playlistId);
                playlistDB = "new";
            }

            if (playlist) {
                if (playlistDB === "old") {
                    // Playlist is in the old DB, so the song must also exist there to be referenced
                    const oldSongData = { ...newSongData, _id: savedNewSong._id }; // Use same ID if possible, though mongo might assign a new one if not compatible
                    const savedOldSong = await OldSong.create(oldSongData);
                    playlist.songs.push(savedOldSong._id);
                    finalSong = savedOldSong; // The song in the context of this playlist is the old one
                } else {
                    // Playlist is in the new DB
                    playlist.songs.push(savedNewSong._id);
                }
                await playlist.save();
                finalPlaylist = playlist;
            }
        }
    }

    return NextResponse.json({
        success: true,
        song: finalSong,
        playlist: finalPlaylist,
        message: "Song uploaded successfully"
    });
} catch (error) {
    console.error("Error in upload:", error);
    return NextResponse.json(
        { success: false, error: "Upload failed: " + error.message },
        { status: 500 }
    );
}
}
