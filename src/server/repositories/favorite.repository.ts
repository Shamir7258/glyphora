import { connectDB } from "@/server/lib/db";
import { FavoriteModel } from "@/server/models/favorite.model";
import { FontRepository } from "@/server/repositories/font.repository";
import { ApiError } from "@/types/errors";
import type { FavoriteDTO } from "@/types/dto";

export const FavoriteRepository = {
  async list(userId: string): Promise<FavoriteDTO[]> {
    await connectDB();
    const docs = await FavoriteModel.find({ user: userId }).sort({ createdAt: -1 }).lean();
    const fonts = await FontRepository.listByIdsPreservingOrder(docs.map((d) => d.font.toString()));
    const fontById = new Map(fonts.map((f) => [f._id.toString(), f]));

    const results: FavoriteDTO[] = [];
    for (const d of docs) {
      const font = fontById.get(d.font.toString());
      if (!font) continue; // font unpublished/removed since favoriting
      results.push({
        id: d._id.toString(),
        font: await FontRepository.toSummaryDTO(font),
        collectionId: d.collection ? d.collection.toString() : null,
        createdAt: d.createdAt ? d.createdAt.toISOString() : new Date().toISOString(),
      });
    }
    return results;
  },

  /** Map of fontId -> favoriteId for the given user, used so grids can show correct heart state. */
  async mapForFonts(userId: string, fontIds: string[]): Promise<Map<string, string>> {
    await connectDB();
    if (fontIds.length === 0) return new Map();
    const docs = await FavoriteModel.find({ user: userId, font: { $in: fontIds } })
      .select("font")
      .lean();
    return new Map(docs.map((d) => [d.font.toString(), d._id.toString()]));
  },

  /** Idempotent: re-favoriting the same font/collection pair returns the existing Favorite. */
  async create(userId: string, fontId: string, collectionId?: string | null): Promise<FavoriteDTO> {
    await connectDB();
    const font = await FontRepository.findByIdUnfiltered(fontId);
    if (!font || font.status !== "PUBLISHED") throw ApiError.notFound("This font isn't available.");

    let doc = await FavoriteModel.findOne({ user: userId, font: fontId, collection: collectionId ?? null });
    if (!doc) {
      doc = await FavoriteModel.create({ user: userId, font: fontId, collection: collectionId ?? null });
      const { FontModel } = await import("@/server/models/font.model");
      await FontModel.findByIdAndUpdate(fontId, { $inc: { favoriteCount: 1 } });
      // Keep the in-memory doc in sync so the DTO below reflects the post-increment
      // count instead of the stale value read before this insert (found via smoke
      // testing: the very first favorite on a font echoed back the pre-increment
      // count in its response).
      font.favoriteCount += 1;
    }

    return {
      id: doc._id.toString(),
      font: await FontRepository.toSummaryDTO(font),
      collectionId: doc.collection ? doc.collection.toString() : null,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
    };
  },

  async remove(favoriteId: string, userId: string): Promise<void> {
    await connectDB();
    const doc = await FavoriteModel.findById(favoriteId);
    if (!doc) throw ApiError.notFound("Favorite not found.");
    if (doc.user.toString() !== userId) throw ApiError.forbidden();

    await doc.deleteOne();
    const { FontModel } = await import("@/server/models/font.model");
    await FontModel.findByIdAndUpdate(doc.font, { $inc: { favoriteCount: -1 } });
  },
};
