import type { NextRequest } from "next/server";
// Ensures every model is registered before .populate() resolves refs by name
// (Category/Tag here) — see src/server/models/index.ts.
import "@/server/models";
import { apiOk, withApiHandler } from "@/types/api";
import { requireDesignerProfileId } from "@/server/lib/session";
import { fontUpdateSchema } from "@/types/schemas/font.schema";
import { FontPublishingService } from "@/server/services/font-publishing.service";
import { connectDB } from "@/server/lib/db";
import { FontModel } from "@/server/models/font.model";
import { FontFileModel } from "@/server/models/font-file.model";
import { StorageService } from "@/server/services/storage/storage.service";
import { ApiError } from "@/types/errors";

/**
 * GET /api/seller/fonts/[id] — full draft state for the wizard/edit page: the
 * font's current fields, its uploaded files (never storageKey — a signed
 * preview URL is resolved instead), and the submission checklist. Not in the
 * original API_CONTRACTS.md table but stays inside the /api/seller/fonts/[id]
 * subtree this agent owns, so it's a safe addition.
 */
export const GET = withApiHandler(async (_request: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { designerProfileId } = await requireDesignerProfileId();
  await connectDB();

  const font = await FontModel.findById(id).populate("category", "name slug").populate("tags", "name slug");
  if (!font) throw ApiError.notFound("Font not found.");
  if (font.designer.toString() !== designerProfileId) throw ApiError.forbidden();

  const files = await FontFileModel.find({ font: id }).sort({ createdAt: 1 }).lean();
  const checklist = await FontPublishingService.getSubmissionChecklist(id);

  const category = font.category as unknown as { _id: unknown; name: string; slug: string } | null;
  const tags = font.tags as unknown as { _id: unknown; name: string; slug: string }[];

  return apiOk({
    id: font._id.toString(),
    slug: font.slug,
    name: font.name,
    description: font.description,
    status: font.status,
    rejectionReason: font.rejectionReason,
    categoryId: category ? category._id?.toString() : null,
    categoryName: category?.name ?? null,
    tagIds: tags.map((t) => t._id?.toString()),
    languages: font.languages,
    glyphCount: font.glyphCount,
    previewText: font.previewText,
    basePriceCents: font.basePriceCents,
    currency: font.currency,
    licenseIds: font.licenses.map((l) => l.toString()),
    files: files.map((f) => ({
      id: f._id.toString(),
      purpose: f.purpose,
      format: f.format,
      originalFilename: f.originalFilename,
      fileSizeBytes: f.fileSizeBytes,
      validated: f.validated,
      previewUrl: f.purpose === "PREVIEW" ? StorageService.getPublicPreviewUrl(f.storageKey) : null,
    })),
    checklist,
  });
});

/** PATCH /api/seller/fonts/[id] — update metadata, only while DRAFT/REJECTED (see docs/API_CONTRACTS.md). */
export const PATCH = withApiHandler(async (request: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { designerProfileId } = await requireDesignerProfileId();
  const body = await request.json();
  const input = fontUpdateSchema.parse(body);

  const font = await FontPublishingService.updateDraftFont(id, designerProfileId, input);

  return apiOk({ id: font._id.toString(), status: font.status });
});
