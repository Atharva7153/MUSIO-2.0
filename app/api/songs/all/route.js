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

    const songs = [...oldSongs, ...newSongs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return NextResponse.json({
      success: true,
      songs: songs.slice(0, 50)
    });
  } catch (error) {
    console.error("Error fetching songs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch songs" },
      { status: 500 }
    );
  }
}
