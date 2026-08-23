import { connectDB } from "@/server/lib/db";
import { DesignerProfileModel } from "@/server/models/designer-profile.model";
import { FontModel } from "@/server/models/font.model";
import { ApiError } from "@/types/errors";
import type { DesignerProfileUpdateInput } from "@/types/schemas/seller.schema";

/** Self-service profile editing for src/app/seller/settings — distinct from the
 * admin agent's designer-management routes (GET/PATCH /api/admin/designers/[id]),
 * which suspend/reinstate accounts rather than let a designer edit their own bio. */
export const SellerProfileService = {
  async getOwnProfile(designerId: string) {
    await connectDB();
    const profile = await DesignerProfileModel.findById(designerId).lean();
    if (!profile) throw ApiError.notFound("Designer profile not found.");
    const fontCount = await FontModel.countDocuments({ designer: designerId, status: "PUBLISHED" });
    return { profile, fontCount };
  },

  async updateOwnProfile(designerId: string, input: DesignerProfileUpdateInput) {
    await connectDB();
    const profile = await DesignerProfileModel.findById(designerId);
    if (!profile) throw ApiError.notFound("Designer profile not found.");

    if (input.displayName !== undefined) profile.displayName = input.displayName;
    if (input.bio !== undefined) profile.bio = input.bio;
    if (input.website !== undefined) profile.website = input.website || null;
    if (input.avatarUrl !== undefined) profile.avatarUrl = input.avatarUrl || null;
    if (input.coverImageUrl !== undefined) profile.coverImageUrl = input.coverImageUrl || null;
    if (input.socialLinks) {
      profile.socialLinks = {
        twitter: input.socialLinks.twitter || profile.socialLinks?.twitter || null,
        instagram: input.socialLinks.instagram || profile.socialLinks?.instagram || null,
        behance: input.socialLinks.behance || profile.socialLinks?.behance || null,
        dribbble: input.socialLinks.dribbble || profile.socialLinks?.dribbble || null,
      };
    }
    if (input.payoutMethod !== undefined) profile.payoutMethod = input.payoutMethod || null;
    if (input.payoutDetails !== undefined) profile.payoutDetails = input.payoutDetails || null;

    await profile.save();
    return profile;
  },
};
