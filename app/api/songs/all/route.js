import { NextResponse } from "next/server";
import { oldDB, newDB } from "../../../lib/mongodb";
import { OldSong } from "../../../models/Song";
import NewSong from "../../../models/Song";

export async function GET() {
  try {
    await Promise.all([oldDB, newDB]);
    
    const oldSongs = await OldSong.find({})
      .sort({ createdAt: -1 })
      .lean();
    
    const newSongs = await NewSong.find({})
      .sort({ createdAt: -1 })
      .lean();

    // Combine and deduplicate by _id (prefer newer songs from NEW db)
    const songMap = new Map();
    
    // Add old songs first
    oldSongs.forEach(song => {
      songMap.set(song._id.toString(), song);
    });
    
    // Add new songs (will overwrite duplicates)
    newSongs.forEach(song => {
      songMap.set(song._id.toString(), song);
    });
    
    // Convert back to array and sort by date
    const uniqueSongs = Array.from(songMap.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return NextResponse.json({
      success: true,
      songs: uniqueSongs.slice(0, 50)
    });
  } catch (error) {
    console.error("Error fetching songs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch songs" },
      { status: 500 }
    );
  }
}
