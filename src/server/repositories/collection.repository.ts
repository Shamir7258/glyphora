import { connectDB } from "@/server/lib/db";
import { CollectionModel } from "@/server/models/collection.model";
import { FontRepository } from "@/server/repositories/font.repository";
import { ApiError } from "@/types/errors";
import type { CollectionDTO } from "@/types/dto";

async function toDTO(doc: InstanceType<typeof CollectionModel>): Promise<CollectionDTO> {
  const fonts = await FontRepository.listByIdsPreservingOrder(doc.fonts.map((f) => f.toString()));
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    isPublic: doc.isPublic,
    fonts: await Promise.all(fonts.map((f) => FontRepository.toSummaryDTO(f))),
  };
}

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

  // ── User-owned "favorite folders" (spec §34) — a customer's own Collections,
  // as opposed to the admin-curated public bundles above. ──────────────────

  async listForUser(userId: string): Promise<CollectionDTO[]> {
    await connectDB();
    const docs = await CollectionModel.find({ user: userId }).sort({ updatedAt: -1 });
    return Promise.all(docs.map((d) => toDTO(d)));
  },

  async findByIdForUser(id: string, userId: string) {
    await connectDB();
    const doc = await CollectionModel.findById(id);
    if (!doc) throw ApiError.notFound("Collection not found.");
    if (doc.user.toString() !== userId) throw ApiError.forbidden();
    return doc;
  },

  async getDetailForUser(id: string, userId: string): Promise<CollectionDTO> {
    const doc = await this.findByIdForUser(id, userId);
    return toDTO(doc);
  },

  async create(
    userId: string,
    input: { name: string; description?: string; isPublic?: boolean }
  ): Promise<CollectionDTO> {
    await connectDB();
    const doc = await CollectionModel.create({
      user: userId,
      name: input.name,
      description: input.description ?? "",
      isPublic: input.isPublic ?? false,
      fonts: [],
    });
    return toDTO(doc);
  },

  async addFont(id: string, userId: string, fontId: string): Promise<CollectionDTO> {
    const doc = await this.findByIdForUser(id, userId);
    const font = await FontRepository.findByIdUnfiltered(fontId);
    if (!font || font.status !== "PUBLISHED") throw ApiError.notFound("This font isn't available.");
    const already = doc.fonts.some((f) => f.toString() === fontId);
    if (!already) {
      doc.fonts.push(font._id);
      await doc.save();
    }
    return toDTO(doc);
  },

  async removeFont(id: string, userId: string, fontId: string): Promise<CollectionDTO> {
    const doc = await this.findByIdForUser(id, userId);
    doc.fonts = doc.fonts.filter((f) => f.toString() !== fontId) as typeof doc.fonts;
    await doc.save();
    return toDTO(doc);
  },
};
