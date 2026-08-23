import { connectDB } from "@/server/lib/db";
import { DesignerProfileModel } from "@/server/models/designer-profile.model";
import { FontModel } from "@/server/models/font.model";
import type { DesignerProfileDTO, DesignerSummaryDTO } from "@/types/dto";

/** Card shape for the /designers browse grid — richer than DesignerSummaryDTO
 * (adds bio + a lightweight product count) but deliberately not added to the
 * shared src/types/dto.ts to avoid touching a file other agents also depend on. */
export type DesignerBrowseCardDTO = DesignerSummaryDTO & {
  bio: string;
  fontCount: number;
};

export const DesignerRepository = {
  async findByUsername(username: string): Promise<DesignerProfileDTO | null> {
    await connectDB();
    const d = await DesignerProfileModel.findOne({ username, status: "ACTIVE" }).lean();
    if (!d) return null;
    const fontCount = await FontModel.countDocuments({ designer: d._id, status: "PUBLISHED" });
    return {
      id: d._id.toString(),
      username: d.username,
      displayName: d.displayName,
      avatarUrl: d.avatarUrl ?? undefined,
      isPlatform: d.isPlatform,
      bio: d.bio,
      coverImageUrl: d.coverImageUrl ?? undefined,
      website: d.website ?? undefined,
      socialLinks: {
        twitter: d.socialLinks?.twitter ?? undefined,
        instagram: d.socialLinks?.instagram ?? undefined,
        behance: d.socialLinks?.behance ?? undefined,
        dribbble: d.socialLinks?.dribbble ?? undefined,
      },
      stats: {
        totalProducts: d.stats?.totalProducts ?? 0,
        totalSalesCount: d.stats?.totalSalesCount ?? 0,
      },
      fontCount,
    };
  },

  /** Ranked by total sales — used for the homepage "Featured Designers" rail. */
  async listFeatured(limit = 6): Promise<DesignerSummaryDTO[]> {
    await connectDB();
    const docs = await DesignerProfileModel.find({ status: "ACTIVE", isPlatform: false })
      .sort({ "stats.totalSalesCount": -1, createdAt: -1 })
      .limit(limit)
      .lean();
    return docs.map((d) => ({
      id: d._id.toString(),
      username: d.username,
      displayName: d.displayName,
      avatarUrl: d.avatarUrl ?? undefined,
      isPlatform: d.isPlatform,
    }));
  },

  /**
   * Paginated "browse all designers" list for /designers — added for the
   * designer-experience agent (see docs/agent-reports/designer-experience.md).
   * Excludes the platform ("Glyphora Originals") account, same as listFeatured.
   */
  async listActive(params: { page?: number; limit?: number; q?: string } = {}): Promise<{
    items: DesignerBrowseCardDTO[];
    total: number;
  }> {
    await connectDB();
    const filter: Record<string, unknown> = { status: "ACTIVE", isPlatform: false };
    if (params.q?.trim()) {
      const q = params.q.trim();
      filter.$or = [
        { displayName: { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
      ];
    }
    const limit = params.limit ?? 24;
    const page = params.page ?? 1;

    const [docs, total] = await Promise.all([
      DesignerProfileModel.find(filter)
        .sort({ "stats.totalSalesCount": -1, displayName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DesignerProfileModel.countDocuments(filter),
    ]);

    return {
      items: docs.map((d) => ({
        id: d._id.toString(),
        username: d.username,
        displayName: d.displayName,
        avatarUrl: d.avatarUrl ?? undefined,
        isPlatform: d.isPlatform,
        bio: d.bio ?? "",
        fontCount: d.stats?.totalProducts ?? 0,
      })),
      total,
    };
  },
};
