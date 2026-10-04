import mongoose from "mongoose";

const SongSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    artist: { type: String, default: "Unknown Artist" },
    url: { type: String, required: true },
    coverImage: { type: String },
    genre: { type: String, default: "Unknown" },
    duration: { type: Number },
    playCount: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export { SongSchema };
export default SongSchema;