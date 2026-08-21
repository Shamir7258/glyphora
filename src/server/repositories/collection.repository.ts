import { connectDB } from "@/server/lib/db";
import { CollectionModel } from "@/server/models/collection.model";
import { FontRepository } from "@/server/repositories/font.repository";
import type { CollectionDTO } from "@/types/dto";

// A "Bundle" (spec §2/§26) is a public Collection — see docs/DEVELOPMENT.md
// "Decisions made to keep this unblocked".
export const CollectionRepository = {
  async listPublicBundles(limit = 4): Promise<CollectionDTO[]> {
    await connectDB();
    const docs = await CollectionModel.find({ isPublic: true }).sort({ updatedAt: -1 }).limit(limit).lean();

    const results: CollectionDTO[] = [];
    for (const doc of docs) {
      const fonts = await FontRepository.listByIdsPreservingOrder(doc.fonts.map((f) => f.toString()));
      results.push({
        id: doc._id.toString(),
        name: doc.name,
        description: doc.description,
        isPublic: doc.isPublic,
        fonts: await Promise.all(fonts.map((f) => FontRepository.toSummaryDTO(f))),
      });
    }
    return results;
  },
};
