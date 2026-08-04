// src/lib/db.ts
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

// 1. Properly initialize and attach the cache to the Node.js global object
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
  // 2. If an active connection exists, return it immediately
  if (cached.conn) {
    return cached.conn;
  }

  // 3. If a connection attempt is already in progress, wait for it instead of starting a new one
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    }).then((mongoose) => mongoose);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Reset promise on failure so next request can retry
    throw e;
  }

  return cached.conn;
};