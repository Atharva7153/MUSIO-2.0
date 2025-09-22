import mongoose from "mongoose";

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


export default mongoose.models.Song || mongoose.model("Song", SongSchema);