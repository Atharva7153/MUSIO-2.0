// app/api/playlist/[id]/route.js
import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongodb";
import Playlist from "../../../models/Playlist";

export async function GET(req, { params }) {
  await connectDB();
  const playlist = await Playlist.findById(params.id).populate("songs");
  return NextResponse.json({ playlist });
}
