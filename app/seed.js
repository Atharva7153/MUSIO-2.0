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
      name: "Hanshal's Mix",
      coverImage:
        "https://res.cloudinary.com/di64iiq19/image/upload/v1757472813/My_Playlist_5_playlist_cover_q2hnfc.jpg",
    },
    [
      {
        title: "Let It All Work Out",
        artist: "Lil Wayne",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471465/Let_It_All_Work_Out_xdpcf4.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471426/16_lil_wayne_let_it_all_work_out_evveoz.jpg",
      },
      {
        title: "Churchill Downs feat. Drake",
        artist: "Lil Wayne",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471464/Churchill_Downs_feat._Drake_se1wv1.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471427/9_jack_harlow_churchill_downs__feat__drake__pewxwn.jpg",
      },
      {
        title: "Life is Good feat. Drake",
        artist: "Future",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471462/Life_Is_Good_feat._Drake_bnpvvy.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471425/14_future_life_is_good__feat__drake__jjwsiq.jpg",
      },
      {
        title: "*8AM in Manny",
        artist: "Nemzzz",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471461/8AM_IN_MANNY_ezdfw4.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471424/22_nemzzz_8am_in_manny_gpjrn4.jpg",
      },
      {
        title: "Walk In Wardrobe",
        artist: "Central Cee",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471461/Walk_In_Wardrobe_o9pmxk.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471424/11_central_cee_walk_in_wardrobe_yukrzn.jpg",
      },
      {
        title: "Limitless",
        artist: "Central Cee",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471461/Limitless_dbg3qu.mp3",
        coverImage: "",
      },
      {
        title: "8AM in Charlotte",
        artist: "Drake",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471459/8am_in_Charlotte_k5vt8z.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471426/1_central_cee_limitless_uhthkd.jpg",
      },
      {
        title: "Straight Back to It",
        artist: "Central Cee",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471455/Straight_Back_to_It_oywqfo.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471426/18_central_cee_straight_back_to_it_nkwic9.jpg",
      },
      {
        title: "Ungrateful",
        artist: "Central Cee",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471452/Ungrateful_c2oydu.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471425/17_central_cee_ungrateful_exhl3o.jpg",
      },
      {
        title: "Loading",
        artist: "Central Cee",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471448/Loading_ugb8kj.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471425/13_central_cee_loading_nolbxr.jpg",
      },
      {
        title: "Must Be",
        artist: "Central Cee",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471448/Must_Be_bnrr5h.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471425/23_central_cee_must_be_ss05kp.jpg",
      },
      {
        title: "Chicago Freestyle feat. Giveon",
        artist: "Drake, Giveon",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471447/Chicago_Freestyle_feat._Giveon_nkjsyw.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471424/21_kairo_keyz_gang_dksqo3.jpg",
      },
      {
        title: "Him All Along",
        artist: "Gunna",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471446/him_all_along_jbhfen.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471426/7_gunna_him_all_along_moopl9.jpg",
      },
      {
        title: "Spinnin' feat. Nemzzz - Segway Remix",
        artist: "OneFour, Nemzzz",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471446/Spinnin_feat._Nemzzz_-_Segway_Remix_hx8ssg.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471427/6_onefour_spinnin__feat__nemzzz____segway_remix_is23ex.jpg",
      },
      {
        title: "Redemption feat. Nemzzz",
        artist: "Kidwild, Nemzzz",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471442/Redemption_feat._Nemzzz_j03bjm.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471427/8_kidwild_redemption__feat__nemzzz__xydoha.jpg",
      },
      {
        title: "Khabib",
        artist: "Central Cee",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471442/Khabib_xn0iwl.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471425/12_central_cee_khabib_bulbhs.jpg",
      },
      {
        title: "Bolide Noir",
        artist: "Central Cee",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471439/Bolide_Noir_r4bqza.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471427/20_central_cee_bolide_noir_jhscfz.jpg",
      },
      {
        title: "90mph",
        artist: "Jbee",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471436/90mph_qkhspm.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471426/3_jbee_90mph_d8n1xs.jpg",
      },
      {
        title: "24_s",
        artist: "Jbee",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471435/24_s_kg2c3a.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471425/4_jbee_24_s_exlizx.jpg",
      },
      {
        title: "Cold Shoulder",
        artist: "Central Cee",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471435/Cold_Shoulder_pz2t6d.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471424/10_central_cee_cold_shoulder_ectt58.jpg",
      },
      {
        title: "I GET IT",
        artist: "Lilaj",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471433/I_GET_IT_pewee9.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471424/10_central_cee_cold_shoulder_ectt58.jpg",
      },
      {
        title: "Indecisive - Is It A Crime",
        artist: "Kidwild",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471433/Indecisive_-_Is_It_A_Crime_rcnucq.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471426/19_kidwild_indecisive___is_it_a_crime_nmgdlu.jpg",
      },
      {
        title: "GANG",
        artist: "Kairo Keyz",
        url: "https://res.cloudinary.com/di64iiq19/video/upload/v1757471432/GANG_jxsnsp.mp3",
        coverImage:
          "https://res.cloudinary.com/di64iiq19/image/upload/v1757471424/21_kairo_keyz_gang_dksqo3.jpg",
      },
    ]
  );

  process.exit();
})();
