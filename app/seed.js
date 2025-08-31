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
      name: "Uzaif's Playlists",
      coverImage:
        "https://res.cloudinary.com/di64iiq19/image/upload/v1756609936/Screenshot_2025-08-31_084122_ndyfo0.png",
    },
    [
      {
        title: "Shape of You",
        artist: "Ed Sheeran",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1756609932/Ed_Sheeran_-_Shape_of_You_Official_Music_Video_kysplw.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1756609936/Screenshot_2025-08-31_084122_ndyfo0.png",
      },
      {
        title: "Unstoppable",
        artist: "Sia",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1756609929/Sia_-_Unstoppable_Lyrics_jtz08y.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1756609936/Screenshot_2025-08-31_084140_vzbsdn.png",
      },
    ]
  );

  process.exit();
})();
