// scripts/seed.js
import connectDB from "./lib/mongodb.js";
import Song from "./models/Song.js";
import Playlist from "./models/Playlist.js";

await connectDB();

/**
 * Add songs (by data) to a given playlist.
 * If song doesn’t exist -> it gets created.
 * If it exists -> reused.
 * Avoids duplicate songs in playlist.
 */
async function addSongsToPlaylist(playlistName, songsData) {
  const songIds = [];

  for (const song of songsData) {
    let existingSong = await Song.findOne({ title: song.title });

    if (!existingSong) {
      existingSong = await Song.create(song);
      console.log(`✅ Created new song: ${song.title}`);
    } else {
      console.log(`🔹 Reusing existing song: ${song.title}`);
    }

    songIds.push(existingSong._id);
  }

  // Find the playlist
  const playlist = await Playlist.findOne({ name: playlistName });
  if (!playlist) {
    console.log(`❌ Playlist not found: ${playlistName}`);
    return;
  }

  // Add songs to playlist (no duplicates)
  songIds.forEach((id) => {
    if (!playlist.songs.includes(id)) {
      playlist.songs.push(id);
      console.log(`🎶 Added song ID: ${id} to playlist: ${playlistName}`);
    }
  });

  await playlist.save();
  console.log(`✅ Playlist "${playlist.name}" updated successfully!`);
}

// Example usage
(async () => {
  await addSongsToPlaylist("Atharva's Playlist", [
    {
      title: "Shaky",
      artist: "Sanju Rathod",
      url: "https://res.cloudinary.com/di64iiq19/video/upload/v1756611665/Shaky_Official_Video_Sanju_Rathod_Ft._Isha_Malviya_G-Spark_New_Marathi_Songs_2025_oukqm1.mp3",
      coverImage: "https://res.cloudinary.com/di64iiq19/image/upload/v1756611655/Screenshot_2025-08-31_091012_mmfvpo.png",
    },
    {
      title: "O Rangrez",
      artist: "Javed Bashir, Shreya Goshal",
      url: "https://res.cloudinary.com/di64iiq19/video/upload/v1756611671/O_Rangrez_-_Lyrcial_Video_Bhaag_Milkha_Bhaag_Farhan_Sonam_Shreya_Ghoshal_Javed_Bashir_tvbbl2.mp3",
      coverImage: "https://res.cloudinary.com/di64iiq19/image/upload/v1756611654/Screenshot_2025-08-31_090935_dwuynn.png"
    }
  ]);

  process.exit()
})();
