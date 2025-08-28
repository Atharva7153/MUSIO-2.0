// app/api/playlists/route.js
import { NextResponse } from "next/server";
import connectDB from "../../lib/mongodb";
import Playlist from "../../models/Playlist";
import Song from "../../models/Song"; 


export async function GET() {
  await connectDB();
  const playlists = await Playlist.find().populate("songs");
  return NextResponse.json({ playlists });
}
