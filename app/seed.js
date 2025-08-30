// scripts/seed.js
import connectDB from "./lib/mongodb.js";
import Song from "./models/Song.js";
import Playlist from "./models/Playlist.js";

await connectDB();

/**
 * Create or reuse a playlist with songs
 */
async function createPlaylistWithSongs(playlistData, songsData) {
  const songIds = [];

  // 1. Create or reuse songs
  for (const song of songsData) {
    let existingSong = await Song.findOne({ title: song.title });

    if (!existingSong) {
      existingSong = await Song.create(song);
      console.log(`✅ Created song: ${song.title}`);
    } else {
      console.log(`🔹 Song already exists: ${song.title}`);
    }

    songIds.push(existingSong._id);
  }

  // 2. Create or reuse playlist
  let playlist = await Playlist.findOne({ name: playlistData.name });

  if (!playlist) {
    playlist = await Playlist.create({
      ...playlistData,
      songs: songIds,
    });
    console.log(`✅ Created playlist: ${playlist.name}`);
  } else {
    // Add missing songs (avoid duplicates)
    songIds.forEach((id) => {
      if (!playlist.songs.includes(id)) {
        playlist.songs.push(id);
      }
    });

    await playlist.save();
    console.log(`🎶 Updated playlist: ${playlist.name}`);
  }
}

// Example usage
(async () => {
  await createPlaylistWithSongs(
    {
      name: "Ai Songs",
      coverImage:
        "https://res.cloudinary.com/di64iiq19/image/upload/v1756402885/Screenshot_2025-08-28_231104_zm2n24.png",
    },
    [
      {
        title: "Mamu Mamu",
        artist: "Suno Ai",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1756402977/Mamu_nzydlu.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1756402951/Screenshot_2025-08-28_231220_f8ukdm.png",
      },
      {
        title: "Vibe Trip",
        artist: "Suno Ai",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1756402978/VibeTrip_owzzdq.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1756402951/Screenshot_2025-08-28_231220_f8ukdm.png",
      },
    ]
  );

  process.exit();
})();
