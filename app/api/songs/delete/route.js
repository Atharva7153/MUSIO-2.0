// app/api/songs/delete/route.js
import { NextResponse } from "next/server";
import { oldDB, newDB } from "../../../lib/mongodb";
import NewSong, { OldSong } from "../../../models/Song";
import NewPlaylist, { OldPlaylist } from "../../../models/Playlist";
import { v2 as cloudinary } from "cloudinary";

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to extract public_id from Cloudinary URL
function extractPublicId(url) {
  if (!url) return null;
  try {
    // URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/v{version}/{public_id}.{format}
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    const pathPart = parts[1];
    // Remove version if present
    const withoutVersion = pathPart.replace(/^v\d+\//, '');
    // Remove extension
    const publicId = withoutVersion.substring(0, withoutVersion.lastIndexOf('.')) || withoutVersion;
    return publicId;
  } catch (error) {
    console.error("Error extracting public_id:", error);
    return null;
  }
}

// Helper function to delete file from Cloudinary
async function deleteFromCloudinary(url, resourceType = 'auto') {
  try {
    const publicId = extractPublicId(url);
    if (!publicId) {
      console.warn("Could not extract public_id from URL:", url);
      return { success: false, error: "Invalid URL" };
    }

    console.log(`Attempting to delete ${resourceType} with public_id:`, publicId);
    
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true
    });
    
    console.log("Cloudinary deletion result:", result);
    return result;
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    return { success: false, error: error.message };
  }
}

export async function DELETE(req) {
  try {
    // Ensure database connections
    await Promise.all([oldDB, newDB]);

    const { searchParams } = new URL(req.url);
    const songId = searchParams.get('id');
    const confirmKey = searchParams.get('key');

    // Validate confirmation key
    const expectedKey = process.env.ADD_TO_PLAYLIST_KEYWORD || "musio";
    if (!confirmKey || confirmKey !== expectedKey) {
      return NextResponse.json(
        { success: false, error: "Invalid confirmation key" },
        { status: 403 }
      );
    }

    if (!songId) {
      return NextResponse.json(
        { success: false, error: "Song ID is required" },
        { status: 400 }
      );
    }

    // Try to find song in both databases
    let song = await NewSong.findById(songId);
    let songDB = "new";
    
    if (!song) {
      song = await OldSong.findById(songId);
      songDB = "old";
    }

    if (!song) {
      return NextResponse.json(
        { success: false, error: "Song not found" },
        { status: 404 }
      );
    }

    console.log(`Deleting song: ${song.title} from ${songDB} database`);

    // Delete files from Cloudinary
    const deletionResults = [];

    // Delete song file (audio/video)
    if (song.url) {
      console.log("Deleting song file from Cloudinary:", song.url);
      const songDeletion = await deleteFromCloudinary(song.url, 'video');
      deletionResults.push({ type: 'song', url: song.url, result: songDeletion });
    }

    // Delete cover image
    if (song.coverImage && !song.coverImage.includes('/default-song.png') && !song.coverImage.includes('/playlist.png')) {
      console.log("Deleting cover image from Cloudinary:", song.coverImage);
      const coverDeletion = await deleteFromCloudinary(song.coverImage, 'image');
      deletionResults.push({ type: 'cover', url: song.coverImage, result: coverDeletion });
    }

    // Remove song from all playlists in both databases
    const playlistUpdates = [];

    // Update new database playlists
    const newPlaylists = await NewPlaylist.find({ songs: songId });
    for (const playlist of newPlaylists) {
      playlist.songs = playlist.songs.filter(id => id.toString() !== songId);
      await playlist.save();
      playlistUpdates.push({ db: 'new', playlistId: playlist._id, name: playlist.name });
    }

    // Update old database playlists
    const oldPlaylists = await OldPlaylist.find({ songs: songId });
    for (const playlist of oldPlaylists) {
      playlist.songs = playlist.songs.filter(id => id.toString() !== songId);
      await playlist.save();
      playlistUpdates.push({ db: 'old', playlistId: playlist._id, name: playlist.name });
    }

    // Delete the song from MongoDB
    if (songDB === "new") {
      await NewSong.findByIdAndDelete(songId);
    } else {
      await OldSong.findByIdAndDelete(songId);
    }

    console.log("Song deleted successfully");
    console.log("Playlist updates:", playlistUpdates);
    console.log("Cloudinary deletions:", deletionResults);

    return NextResponse.json({
      success: true,
      message: "Song deleted successfully",
      deletedSong: {
        id: song._id,
        title: song.title,
        artist: song.artist
      },
      cloudinaryDeletions: deletionResults,
      playlistsUpdated: playlistUpdates.length,
      details: {
        playlists: playlistUpdates,
        cloudinary: deletionResults
      }
    });

  } catch (error) {
    console.error("Error deleting song:", error);
    return NextResponse.json(
      { success: false, error: "Delete failed: " + error.message },
      { status: 500 }
    );
  }
}
