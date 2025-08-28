// scripts/seed.js
import connectDB from "./lib/mongodb.js"; // your DB connection file
import Song from "./models/Song.js";
import Playlist from "./models/Playlist.js";

async function seed() {
  await connectDB();

  // 1. Create songs manually
  const song1 = await Song.create({
    title: "Na Bhoola Tujhe",
    artist: "Movie - Hi Nanna",
    url: "https://res.cloudinary.com/di64iiq19/video/upload/v1756399920/Hi_Papa__Na_Bhoola_Tujhe_FULL_VIDEO_Nani_Mrunal_Thakur_Geetha_Vineeth_Hesham_W_Kausar_M_qgl3ze.mp3",
    coverImage: "https://res.cloudinary.com/di64iiq19/image/upload/v1756311887/Screenshot_2025-08-27_215309_ortks5.png",
  });

  const song2 = await Song.create({
    title: "Dance Ka Bhoot",
    artist: "Arjit Singh",
    url: "https://res.cloudinary.com/di64iiq19/video/upload/v1756311831/Liggi_soqg6c.mp3",
    coverImage: "https://res.cloudinary.com/di64iiq19/video/upload/v1756400129/Dance_Ka_Bhoot_-_Film_Version_Brahm%C4%81stra_Ranbir_Alia_Pritam_Arijit_Amitabh_xfsgz5.mp3"
  });

  console.log("Songs created ✅");

  // 2. Create playlists manually
  const playlist1 = await Playlist.create({
    name: "Atharva's Playlist",
    coverImage: "https://res.cloudinary.com/di64iiq19/image/upload/v1756400177/Screenshot_2025-08-28_222111_zgcpy6.png",
    songs: [song1._id, song2._id],
  });

  

  console.log("Playlists created ✅");

  process.exit();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
