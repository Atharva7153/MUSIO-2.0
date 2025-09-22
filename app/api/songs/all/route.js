import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongodb";
import Song from "../../../models/Song";

export async function GET() {
  try {
    await connectDB();
    
    const songs = await Song.find({})
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(50) // Limit to 50 most recent songs
      .lean();
    
    return NextResponse.json({
      success: true,
      songs: songs
    });
  } catch (error) {
    console.error("Error fetching songs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch songs" },
      { status: 500 }
    );
  }
}
