import mongoose from "mongoose";
import dotenv from "dotenv"

dotenv.config()
// Accept either MONGO_URI (used in this project) or the common MONGODB_URI
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "❌ Please define the MONGO_URI (or MONGODB_URI) environment variable.\n" +
      "Create a .env file in the project root with:\n" +
      "MONGO_URI=your_mongodb_connection_string\n" +
      "Then restart the dev server (npm run dev)."
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export default async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false, // optional, prevents model issues
    }).then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
