import mongoose from "mongoose";

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URI_NEW;

if (!MONGO_URI) {
  throw new Error("MongoDB URI is not defined in environment variables.");
}

// Use a global object to cache the connection in development
global.mongooseConnections = global.mongooseConnections || {};

if (!global.mongooseConnections.newDb) {
  global.mongooseConnections.newDb = mongoose.createConnection(MONGO_URI);
}

export const newDB = global.mongooseConnections.newDb;

export default async function connectDB() {
  await newDB.asPromise();
  return newDB;
}

export async function connectToDatabase(connection = newDB) {
  await connection.asPromise();
  return connection.getClient();
}
