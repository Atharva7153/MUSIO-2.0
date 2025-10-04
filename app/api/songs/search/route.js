// app/api/songs/search/route.js
import Song from "../../../models/Song";
import connectDB from "../../../lib/mongodb";
import { jsonResponse, errorResponse } from "../../../lib/apiHelpers";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");

    if (!query) {
      return jsonResponse({ songs: [] });
    }

    const songs = await Song.find({
      $or: [
        { title: { $regex: query, $options: "i" } }, // case-insensitive search in title
        { artist: { $regex: query, $options: "i" } }, // case-insensitive search in artist
      ]
    }).limit(10);

    // Ensure we're sending valid JSON data
    return jsonResponse({ songs });
  } catch (error) {
    console.error("Search API error:", error);
    return errorResponse("Failed to search songs", 500);
  }
}
