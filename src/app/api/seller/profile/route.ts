import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { requireDesignerProfileId } from "@/server/lib/session";
import { designerProfileUpdateSchema } from "@/types/schemas/seller.schema";
import { SellerProfileService } from "@/server/services/seller-profile.service";

export const GET = withApiHandler(async () => {
  const { designerProfileId } = await requireDesignerProfileId();
  const { profile, fontCount } = await SellerProfileService.getOwnProfile(designerProfileId);

  return apiOk({
    id: profile._id.toString(),
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    coverImageUrl: profile.coverImageUrl,
    website: profile.website,
    socialLinks: profile.socialLinks,
    payoutMethod: profile.payoutMethod,
    payoutDetails: profile.payoutDetails,
    isPlatform: profile.isPlatform,
    stats: profile.stats,
    fontCount,
  });
});

export const PATCH = withApiHandler(async (request: NextRequest) => {
  const { designerProfileId } = await requireDesignerProfileId();
  const body = await request.json();
  const input = designerProfileUpdateSchema.parse(body);

  const profile = await SellerProfileService.updateOwnProfile(designerProfileId, input);

  return apiOk({
    id: profile._id.toString(),
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    coverImageUrl: profile.coverImageUrl,
    website: profile.website,
    socialLinks: profile.socialLinks,
    payoutMethod: profile.payoutMethod,
    payoutDetails: profile.payoutDetails,
  });
});
