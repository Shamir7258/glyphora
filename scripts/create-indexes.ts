/**
 * Explicitly (re)builds every Mongoose-declared index. Mongoose auto-creates
 * indexes on first connect in development (autoIndex defaults to true), but
 * production deployments should set `autoIndex: false` and run this as a
 * deliberate migration step instead — see docs/DATABASE.md.
 *
 * Run with: npm run db:indexes
 */
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const envLocalPath = path.join(process.cwd(), ".env.local");
loadEnv({ path: existsSync(envLocalPath) ? envLocalPath : path.join(process.cwd(), ".env") });

import { connectDB } from "@/server/lib/db";
import * as models from "@/server/models";

async function main() {
  await connectDB();
  const modelNames = mongoose.modelNames();
  console.log(`Building indexes for ${modelNames.length} models…`);

  for (const name of modelNames) {
    const model = mongoose.model(name);
    await model.syncIndexes();
    console.log(`  ✓ ${name}`);
  }

  console.log("Done.");
  void models; // ensure the barrel import (and every schema registration) isn't tree-shaken away
}

main()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error(err);
    return mongoose.disconnect().finally(() => process.exit(1));
  });
