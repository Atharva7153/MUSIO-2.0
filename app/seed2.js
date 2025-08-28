// scripts/seed.js
import connectDB from "./lib/mongodb.js";
import Song from "./models/Song.js";
import Playlist from "./models/Playlist.js";

async function addSongsToExistingPlaylist() {
  await connectDB();

  // 1. Create or get songs (avoid duplicates by title)
  const songsData = [
    {
      title: "Na Bhoola Tujhe",
      artist: "Movie - Hi Nanna",
      url: "https://res.cloudinary.com/di64iiq19/video/upload/v1756399920/Hi_Papa__Na_Bhoola_Tujhe_FULL_VIDEO_Nani_Mrunal_Thakur_Geetha_Vineeth_Hesham_W_Kausar_M_qgl3ze.mp3",
      coverImage: "https://res.cloudinary.com/di64iiq19/image/upload/v1756311887/Screenshot_2025-08-27_215309_ortks5.png",
    },
    {
      title: "Dance Ka Bhoot",
      artist: "Arjit Singh",
      url: "https://res.cloudinary.com/di64iiq19/video/upload/v1756311831/Liggi_soqg6c.mp3",
      coverImage: "https://res.cloudinary.com/di64iiq19/video/upload/v1756400129/Dance_Ka_Bhoot_-_Film_Version_Brahm%C4%81stra_Ranbir_Alia_Pritam_Arijit_Amitabh_xfsgz5.mp3"
    }
  ];

  const songIds = [];

  for (const song of songsData) {
    // check if song already exists
    let existingSong = await Song.findOne({ title: song.title });
    if (!existingSong) {
      existingSong = await Song.create(song);
      console.log(`Song created: ${song.title} ✅`);
    } else {
      console.log(`Song already exists: ${song.title} 🔹`);
    }
    songIds.push(existingSong._id);
  }

  // 2. Find the existing playlist
  const playlist = await Playlist.findOne({ name: "Atharva's Playlist" });
  if (!playlist) {
    console.log("Playlist not found ❌");
    process.exit(1);
  }

  // 3. Add new songs to the playlist (avoid duplicates)
  songIds.forEach((id) => {
    if (!playlist.songs.includes(id)) {
      playlist.songs.push(id);
    }
  });

  await playlist.save();
  console.log("Songs added to existing playlist ✅");

  process.exit();
}

addSongsToExistingPlaylist().catch((err) => {
  console.error(err);
  process.exit(1);
});
// Note: Run this script with `node app/seed2.js`