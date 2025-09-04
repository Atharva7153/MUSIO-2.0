const cloudinary = require("cloudinary").v2;
const fs = require("fs");

// Configure Cloudinary
cloudinary.config({
  cloud_name: "di64iiq19",
  api_key: "934864185944416",
  api_secret: "bkGAtmnVcDMWq3ppNosmszXIE3I"
});

// Tags
const songTag = "A-playlist";
const artTag = "A-art";

// Fetch resources by tag
async function getResourcesByTag(tag, resourceType) {
  let resources = [];
  let nextCursor = null;

  do {
    const res = await cloudinary.api.resources_by_tag(tag, {
      resource_type: resourceType,
      max_results: 500,
      next_cursor: nextCursor
    });

    resources = resources.concat(res.resources);
    nextCursor = res.next_cursor;
  } while (nextCursor);

  return resources;
}

async function generatePlaylistJSON() {
  try {
    // Get songs and artworks
    const songs = await getResourcesByTag(songTag, "video"); // mp3s are video
    const artworks = await getResourcesByTag(artTag, "image"); // artworks are images

    console.log(`🎵 Found ${songs.length} songs and ${artworks.length} artworks`);

    // Generate JSON
    const playlist = songs.map((song, index) => ({
      title: "", // empty
      artist: "", // empty
      url: song.secure_url,
      coverImage: artworks[index] ? artworks[index].secure_url : "" // match by index
    }));

    // Write to file
    fs.writeFileSync("playlist.json", JSON.stringify(playlist, null, 2));
    console.log("✅ JSON file created: playlist.json");
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

generatePlaylistJSON();
