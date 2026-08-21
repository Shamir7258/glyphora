import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Next.js dev-mode hot-reloads modules; cache the connection on `global` so we
// don't open a new connection pool on every request/reload.
declare global {
  var __glyphoraMongoose: MongooseCache | undefined;
}

const cache: MongooseCache = global.__glyphoraMongoose ?? { conn: null, promise: null };
global.__glyphoraMongoose = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  // Read lazily, inside the function, rather than at module top level — ESM
  // import hoisting means a module-top-level read can run before a caller (e.g.
  // scripts/seed.ts) has finished loading .env.local via dotenv.
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI environment variable. Copy .env.example to .env.local and set it.");
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
    });
  }
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}
