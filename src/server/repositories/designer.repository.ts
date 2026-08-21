import { connectDB } from "@/server/lib/db";
import { DesignerProfileModel } from "@/server/models/designer-profile.model";
import { FontModel } from "@/server/models/font.model";
import type { DesignerProfileDTO, DesignerSummaryDTO } from "@/types/dto";

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
};
