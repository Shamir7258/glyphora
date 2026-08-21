import mongoose from "mongoose";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

// vitest doesn't auto-load .env.local the way `next dev`/tsx do — pull in
// NEXTAUTH_SECRET, STORAGE_PROVIDER, etc. so services that need them (e.g. the
// local-storage signed-URL helper) behave the same under test as in dev.
const envLocalPath = path.join(process.cwd(), ".env.local");
loadEnv({ path: existsSync(envLocalPath) ? envLocalPath : path.join(process.cwd(), ".env") });

// Dedicated test database on the real local mongod. mongodb-memory-server (the
// more common choice for this) can't spawn its own mongod binary in this sandbox
// — see the note in tests/unit/commission.service.test.ts. If your environment
// *can* run mongodb-memory-server, swapping this back is a drop-in change: the
// only contract each test relies on is connectTestDB()/disconnectTestDB().
const TEST_DB_URI = process.env.MONGODB_TEST_URI ?? "mongodb://127.0.0.1:27017/glyphora_test";

// src/server/lib/db.ts's connectDB() reads process.env.MONGODB_URI lazily and
// caches its connection on `global` — pointing that at the test DB (rather than
// opening a second, separate mongoose connection here) means service code under
// test uses the exact same connectDB() singleton production code does.
process.env.MONGODB_URI = TEST_DB_URI;

export async function connectTestDB() {
  const { connectDB } = await import("@/server/lib/db");
  await connectDB();
  // Start every test file with a clean slate rather than relying on afterEach in
  // every file to have cleaned up perfectly.
  await mongoose.connection.dropDatabase();
}

export async function disconnectTestDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

/**
 * Clears a mixed set of Mongoose models between tests. A plain array of
 * different models' `.map(m => m.deleteMany({}))` doesn't typecheck (each
 * model's `deleteMany` overloads differ by its own `FilterQuery<T>`, so the
 * union isn't callable) — accepting `Model<any>[]` here sidesteps that.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional: accepts models of any document shape
export async function clearCollections(models: mongoose.Model<any>[]) {
  await Promise.all(models.map((m) => m.deleteMany({})));
}
