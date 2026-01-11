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
  await addSongsToPlaylist("Atharva's Playlist", 
    [
  
  {
    title: "Gehra hua",
    artist: "Arjit Singh",
    url: "https://res.cloudinary.com/di64iiq19/video/upload/v1768051418/songs/amxu7yw4u5cx1l11uoru.webm",
    coverImage: "https://res.cloudinary.com/di64iiq19/image/upload/v1768051421/playlist_covers/hx6jehykk7mwo3zzqjld.png",
  },
  
]


  );

  process.exit()
})();
