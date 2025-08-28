// app/api/songs/search/route.js
import Song from "../../../models/Song";
import connectDB from "../../../lib/mongodb";

export async function GET(req) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");

  if (!query) return new Response(JSON.stringify({ songs: [] }), { status: 200 });

  const songs = await Song.find({
    title: { $regex: query, $options: "i" }, // case-insensitive search
  }).limit(10);

  return new Response(JSON.stringify({ songs }), { status: 200 });
}
