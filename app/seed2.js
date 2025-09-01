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
    title: "O mahi",
    artist: "Arjit Singh",
    url: "https://res.cloudinary.com/di64iiq19/video/upload/v1756692860/SpotiDownloader.com_-_O_Maahi_From__Dunki__-_Pritam_ydecd3.mp3",
    coverImage: "https://res.cloudinary.com/di64iiq19/image/upload/v1756692861/Cover_of_O_Maahi_From__Dunki__by_Pritam_Arijit_Singh_Irshad_Kamil_yvbfuh.jpg",
  },
  
]


  );

  process.exit()
})();
