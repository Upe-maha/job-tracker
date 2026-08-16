// src/lib/db.ts
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// The connection is cached on globalThis, not in a module variable: a
// serverless invocation gets a fresh module registry but the same global, so
// this is what stops every request opening a new pool.
declare global {
  var mongooseCache: MongooseCache | undefined
}

const cached: MongooseCache = (globalThis.mongooseCache ??= {
  conn: null,
  promise: null,
})

export const connectDB = async () => {
  if (cached.conn) {
    return cached.conn
  }

  // Caching the in-flight promise too, so concurrent requests during a cold
  // start await one connection instead of racing to open several.
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null // Reset promise on failure so next request can retry
    throw e
  }

  return cached.conn
}
