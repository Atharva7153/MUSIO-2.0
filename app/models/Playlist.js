import mongoose from "mongoose";
import { oldDB, newDB } from "../lib/mongodb.js";

const PlaylistSchema = new mongoose.Schema({
    name : {type : String, required : true},
    coverImage : {type : String, required : true, default: "/playlist.png"},
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],


}, {timestamps : true})

// Model for the old database (for reading)
export const OldPlaylist = oldDB.models.Playlist || oldDB.model("Playlist", PlaylistSchema);

// Model for the new database (for writing)
const NewPlaylist = newDB.models.Playlist || newDB.model("Playlist", PlaylistSchema);

export default NewPlaylist;