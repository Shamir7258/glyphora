/**
 * Creates the `fonts_search` Atlas Search index (definition mirrored in
 * docs/DATABASE.md). Only works against a MongoDB Atlas cluster — a local/
 * self-hosted mongod doesn't support Atlas Search at all, and this will fail with
 * a clear error there. Only run this once SEARCH_PROVIDER=atlas is actually
 * intended (see src/server/services/search/ for the local-dev fallback that
 * makes this script optional for local development).
 *
 * Run with: npm run search:setup
 */
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const envLocalPath = path.join(process.cwd(), ".env.local");
loadEnv({ path: existsSync(envLocalPath) ? envLocalPath : path.join(process.cwd(), ".env") });

import { connectDB } from "@/server/lib/db";

const INDEX_NAME = "fonts_search";

const INDEX_DEFINITION = {
  mappings: {
    dynamic: false,
    fields: {
      name: {
        type: "string",
        analyzer: "lucene.standard",
        multi: { autocomplete: { type: "autocomplete" } },
      },
      description: { type: "string" },
      designerName: { type: "string" },
      categoryName: { type: "string" },
      tagNames: { type: "string" },
      status: { type: "token" },
      basePriceCents: { type: "number" },
      publishedAt: { type: "date" },
      licenses: { type: "objectId" },
    },
  },
};

async function main() {
  const conn = await connectDB();
  const db = conn.connection.db;
  if (!db) throw new Error("No active database connection.");

  const collection = db.collection("fonts");

  const existing = await collection.listSearchIndexes(INDEX_NAME).toArray().catch(() => []);
  if (existing.length > 0) {
    console.log(`Index "${INDEX_NAME}" already exists — updating definition.`);
    await collection.updateSearchIndex(INDEX_NAME, INDEX_DEFINITION);
  } else {
    console.log(`Creating index "${INDEX_NAME}"…`);
    await collection.createSearchIndex({ name: INDEX_NAME, definition: INDEX_DEFINITION });
  }

  console.log("Done. Note: Atlas Search indexes build asynchronously — check the Atlas UI for build status.");
}

main()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error(
      "Failed to set up Atlas Search — this command only works against a MongoDB Atlas cluster " +
        "(SEARCH_PROVIDER=local, the default, does not need this)."
    );
    console.error(err.message ?? err);
    return mongoose.disconnect().finally(() => process.exit(1));
  });
