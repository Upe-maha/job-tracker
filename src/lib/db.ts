import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

let cached = (global as any).mongoose || {
    conn: null,
    promise: null,
}

export const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

    cached.promise = mongoose.connect(MONGODB_URI, {
        bufferCommands: false,
    });

  cached.conn = await cached.promise;
  return cached.conn;
};