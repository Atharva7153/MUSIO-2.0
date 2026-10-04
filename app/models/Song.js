import mongoose from "mongoose";
import { newDB } from "../lib/mongodb.js";

const SongSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    artist: { type: String, default: "Unknown Artist" },
    url: { type: String, required: true },
    coverImage: { type: String },
    genre: { type: String, default: "Unknown" },
    duration: { type: Number }, // in seconds
    playCount: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Song = newDB.models.Song || newDB.model("Song", SongSchema);

export default Song;