// scripts/seed.js
import connectDB from "./lib/mongodb.js"; // your DB connection file
import Song from "./models/Song.js";
import Playlist from "./models/Playlist.js";

async function seed() {
  await connectDB();

  // 1. Create songs manually
  const song1 = await Song.create({
    title: "Heer Ranjha",
    artist: "Bhuvan Bam",
    url: "https://res.cloudinary.com/di64iiq19/video/upload/v1756311713/Heer_ranjha_ittzmi.mp3",
    coverImage: "https://res.cloudinary.com/di64iiq19/image/upload/v1756311887/Screenshot_2025-08-27_215309_ortks5.png",
  });

  const song2 = await Song.create({
    title: "Liggi",
    artist: "Ritviz",
    url: "https://res.cloudinary.com/di64iiq19/video/upload/v1756311831/Liggi_soqg6c.mp3",
    coverImage: "https://res.cloudinary.com/di64iiq19/image/upload/v1756311888/Screenshot_2025-08-27_215425_xg4mpw.png",
  });

  

  console.log("Songs created ✅");

  // 2. Create playlists manually
  const playlist1 = await Playlist.create({
    name: "INDIE",
    coverImage: "https://res.cloudinary.com/di64iiq19/image/upload/v1756311929/Screenshot_2025-08-27_215005_grhvyv.png",
    songs: [song1._id, song2._id],
  });

  

  console.log("Playlists created ✅");

  process.exit();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
