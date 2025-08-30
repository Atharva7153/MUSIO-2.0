// scripts/seed.js
import connectDB from "./lib/mongodb.js";
import Song from "./models/Song.js";
import Playlist from "./models/Playlist.js";

await connectDB();

/**
 * Add songs to a given playlist by title.
 * If songs already exist in DB, reuse them.
 * If they don’t exist, log an error.
 */
async function addSongsToPlaylist(playlistName, songTitles) {
  // 1. Find songs
  const songs = await Song.find({ title: { $in: songTitles } });
  if (songs.length === 0) {
    console.log("❌ No matching songs found in DB for:", songTitles);
    return;
  }

  // 2. Find playlist
  const playlist = await Playlist.findOne({ name: playlistName });
  if (!playlist) {
    console.log(`❌ Playlist not found: ${playlistName}`);
    return;
  }

  // 3. Add songs (no duplicates)
  songs.forEach((song) => {
    if (!playlist.songs.includes(song._id)) {
      playlist.songs.push(song._id);
      console.log(`✅ Added "${song.title}" to ${playlist.name}`);
    } else {
      console.log(`🔹 "${song.title}" already in ${playlist.name}`);
    }
  });

  await playlist.save();
  console.log(`🎶 Playlist "${playlist.name}" updated successfully!`);
}

// Example usage
(async () => {
  await addSongsToPlaylist("Atharva's Playlist", [
    "Alag Aasmaan",
    
  ]);

  

  process.exit();
})();
