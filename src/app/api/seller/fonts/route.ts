import type { NextRequest } from "next/server";
// Ensures every model is registered before .populate() resolves refs by name
// (Category here) — see src/server/models/index.ts.
import "@/server/models";
import { apiOk, withApiHandler } from "@/types/api";
import { requireDesignerProfileId } from "@/server/lib/session";
import { createDraftFontSchema } from "@/types/schemas/font.schema";
import { FontPublishingService } from "@/server/services/font-publishing.service";
import { connectDB } from "@/server/lib/db";
import { FontModel } from "@/server/models/font.model";
import { FontFileModel } from "@/server/models/font-file.model";

/** GET /api/seller/fonts — this designer's fonts, any status (see docs/API_CONTRACTS.md). */
export const GET = withApiHandler(async () => {
  const { designerProfileId } = await requireDesignerProfileId();
  await connectDB();

  const fonts = await FontModel.find({ designer: designerProfileId })
    .sort({ updatedAt: -1 })
    .populate("category", "name slug")
    .lean();

  const fileCounts = await FontFileModel.aggregate([
    { $match: { font: { $in: fonts.map((f) => f._id) } } },
    { $group: { _id: { font: "$font", purpose: "$purpose" }, count: { $sum: 1 } } },
  ]);
  const counts = new Map<string, { preview: number; deliverable: number }>();
  for (const row of fileCounts) {
    const fontId = row._id.font.toString();
    const entry = counts.get(fontId) ?? { preview: 0, deliverable: 0 };
    if (row._id.purpose === "PREVIEW") entry.preview = row.count;
    else entry.deliverable = row.count;
    counts.set(fontId, entry);
  }

  return apiOk(
    fonts.map((f) => {
      const category = f.category as unknown as { name: string; slug: string } | null;
      return {
        id: f._id.toString(),
        slug: f.slug,
        name: f.name,
        status: f.status,
        productType: f.productType,
        category: category ? { name: category.name, slug: category.slug } : null,
        basePriceCents: f.basePriceCents,
        currency: f.currency,
        salesCount: f.salesCount,
        rejectionReason: f.rejectionReason,
        publishedAt: f.publishedAt ? f.publishedAt.toISOString() : null,
        updatedAt: f.updatedAt.toISOString(),
        fileCounts: counts.get(f._id.toString()) ?? { preview: 0, deliverable: 0 },
      };
    })
  );
});

/** POST /api/seller/fonts — create a DRAFT font, returns { fontId } (see docs/API_CONTRACTS.md). */
export const POST = withApiHandler(async (request: NextRequest) => {
  const { designerProfileId } = await requireDesignerProfileId();
  const body = await request.json().catch(() => ({}));
  const input = createDraftFontSchema.parse(body);

  const font = await FontPublishingService.createDraftFont({
    designerId: designerProfileId,
    name: input.name,
    // Placeholders — replaced for real by the Details wizard step's PATCH before
    // the font can pass the submission checklist (see getSubmissionChecklist).
    description: "",
    categoryId: await firstActiveCategoryId(),
    tagIds: [],
    languages: ["English"],
    glyphCount: 0,
    productType: "MARKETPLACE",
    creationSource: "MARKETPLACE_UPLOAD",
  });

  return apiOk({ fontId: font._id.toString(), slug: font.slug }, 201);
});

async function firstActiveCategoryId(): Promise<string> {
  const { CategoryModel } = await import("@/server/models/category.model");
  const category = await CategoryModel.findOne({ isActive: true }).sort({ sortOrder: 1 }).select("_id").lean();
  if (!category) throw new Error("No active categories exist — seed the database first.");
  return category._id.toString();
}
