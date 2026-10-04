import mongoose from "mongoose";
import { newDB } from "../lib/mongodb.js";
import "./Song.js";

const PlaylistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    coverImage: { type: String, required: true, default: "/playlist.png" },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
  },
  { timestamps: true }
);

const Playlist =
  newDB.models.Playlist || newDB.model("Playlist", PlaylistSchema);

export default Playlist;