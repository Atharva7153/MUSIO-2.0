const cloudinary = require("cloudinary").v2;
const fs = require("fs");

// Configure Cloudinary
cloudinary.config({
  cloud_name: "di64iiq19",
  api_key: "934864185944416",
  api_secret: "bkGAtmnVcDMWq3ppNosmszXIE3I"
});

// Song Tag
const songTag = "H-gym";

// Fetch resources
async function getResources(resourceType, tag = null) {
  let resources = [];
  let nextCursor = null;

  do {
    const res = tag
      ? await cloudinary.api.resources_by_tag(tag, {
          resource_type: resourceType,
          max_results: 500,
          next_cursor: nextCursor
        })
      : await cloudinary.api.resources({
          resource_type: resourceType,
          type: "upload",
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
    // Get songs by tag
    const songs = await getResources("video", songTag);

    // Get artworks (all images, no tag filter)
    const artworks = await getResources("image");

    console.log(`🎵 Found ${songs.length} songs and ${artworks.length} artworks`);

    // Generate JSON
    const playlist = songs.map((song, index) => ({
      title: "", // you can parse from filename if you want
      artist: "",
      url: song.secure_url,
      coverImage: ""
    }));

    // Write to file
    fs.writeFileSync("playlist.json", JSON.stringify(playlist, null, 2));
    console.log("✅ JSON file created: playlist.json");
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

generatePlaylistJSON();
