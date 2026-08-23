import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { requireDesignerProfileId } from "@/server/lib/session";
import { FontPublishingService } from "@/server/services/font-publishing.service";
import { ApiError } from "@/types/errors";

const CHECK_LABELS: Record<string, string> = {
  hasName: "Give the font a real name",
  hasDescription: "Write a description (at least 20 characters)",
  hasCategory: "Choose a category",
  hasTags: "Add at least one tag",
  hasDeliverableFile: "Upload at least one deliverable font file",
  hasPreviewFile: "Upload at least one preview font file",
  hasPrice: "Set a price of at least $1.00",
  hasLicense: "Select at least one license",
};

/**
 * POST /api/seller/fonts/[id]/submit — DRAFT|REJECTED → PENDING_REVIEW. A font
 * NEVER gets published directly from this route (spec §18) — it always lands in
 * the admin moderation queue. Validates every wizard step is actually complete
 * server-side (never trust the client got through all steps) before delegating
 * the status transition to FontPublishingService.submitForReview.
 */
export const POST = withApiHandler(async (_request: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { designerProfileId } = await requireDesignerProfileId();

  // Ownership + DRAFT/REJECTED check (also guards against submitting someone else's font).
  await FontPublishingService.assertEditableDraft(id, designerProfileId);

  const checklist = await FontPublishingService.getSubmissionChecklist(id);
  if (!checklist.ready) {
    const fieldErrors: Record<string, string[]> = {};
    for (const key of checklist.missing) fieldErrors[key] = [CHECK_LABELS[key] ?? key];
    throw ApiError.validation("Finish every step before submitting for review.", fieldErrors);
  }

  const font = await FontPublishingService.submitForReview(id);

  return apiOk({ id: font._id.toString(), status: font.status });
});
