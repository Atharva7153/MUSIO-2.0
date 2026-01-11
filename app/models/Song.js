import mongoose from "mongoose";
import { oldDB, newDB } from "../lib/mongodb.js";

const SongSchema = new mongoose.Schema({
    title : {type : String, required : true},
    artist : {type : String, required : true},
    url : {type : String, required : true},
    coverImage : {type : String},
    genre : {type : String, default : 'Unknown'},
    duration : {type : Number}, // in seconds
    playCount : {type : Number, default : 0},
    likes : {type : Number, default : 0}
}, {timestamps : true})


// Model for the old database (for reading)
export const OldSong = oldDB.models.Song || oldDB.model("Song", SongSchema);

// Model for the new database (for writing)
const NewSong = newDB.models.Song || newDB.model("Song", SongSchema);


export default NewSong;