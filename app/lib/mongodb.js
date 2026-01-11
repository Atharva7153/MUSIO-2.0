import mongoose from "mongoose";

// Helper function to create and cache a database connection
const createConnection = (uri) => {
  if (!uri) {
    throw new Error("MongoDB URI is not defined.");
  }
  const connection = mongoose.createConnection(uri, {
    bufferCommands: false,
  });
  return connection;
};

// --- Connections ---
// Use a global object to cache connections and prevent re-creating them on every request in development
global.mongooseConnections = global.mongooseConnections || {};

// Connection for the OLD database (reading existing data)
let oldDb = global.mongooseConnections.oldDb;
if (!oldDb) {
  oldDb = global.mongooseConnections.oldDb = createConnection(process.env.MONGO_URI_OLD);
}

// Connection for the NEW database (writing new data)
let newDb = global.mongooseConnections.newDb;
if (!newDb) {
  newDb = global.mongooseConnections.newDb = createConnection(process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URI_NEW);
}


// --- Exports ---
export const oldDB = oldDb;
export const newDB = newDb;

// Default export can be one of the connections, or you can choose based on your primary use case.
// Let's default to the new database connection.
export default newDb;


// A helper to connect and get the native client
export async function connectToDatabase(connection) {
    await connection;
    return connection.getClient();
}
