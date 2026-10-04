import mongoose from "mongoose";

const getMongoUri = () =>
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URI_NEW;

// Use a global object to cache the connection in development
global.mongooseConnections = global.mongooseConnections || {};

if (!global.mongooseConnections.newDb) {
  const initialUri = getMongoUri();
  // Allow build-time import without throwing if env vars are only injected at container runtime
  global.mongooseConnections.newDb = initialUri
    ? mongoose.createConnection(initialUri)
    : mongoose.createConnection();
}

export const newDB = global.mongooseConnections.newDb;

export default async function connectDB() {
  if (newDB.readyState === 0) {
    const uri = getMongoUri();
    if (!uri) {
      throw new Error("MongoDB URI is not defined in environment variables.");
    }
    await newDB.openUri(uri);
  }
  await newDB.asPromise();
  return newDB;
}

export async function connectToDatabase(connection = newDB) {
  await connectDB();
  return connection.getClient();
}
