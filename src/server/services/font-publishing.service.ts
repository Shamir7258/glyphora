import { connectDB } from "@/server/lib/db";
import { FontModel } from "@/server/models/font.model";
import { CategoryModel } from "@/server/models/category.model";
import { DesignerProfileModel } from "@/server/models/designer-profile.model";
import { TagModel } from "@/server/models/tag.model";
import { FontFileModel } from "@/server/models/font-file.model";
import { FontVariantModel } from "@/server/models/font-variant.model";
import { FontLicenseModel } from "@/server/models/font-license.model";
import { StorageService, type StorageBucket } from "@/server/services/storage/storage.service";
import { FontFileService } from "@/server/services/storage/font-file.service";
import { ApiError } from "@/types/errors";
import slugify from "slugify";
import { nanoid } from "nanoid";
import type { CreationSource, ProductType, FontFilePurpose, FontFormat } from "@/types/enums";

export type DraftFontInput = {
  designerId: string;
  name: string;
  description: string;
  categoryId: string;
  tagIds: string[];
  languages: string[];
  glyphCount: number;
  productType: ProductType;
  creationSource: CreationSource;
};

/**
 * Source-agnostic publishing boundary (spec §41-42). V1 only ever calls this from
 * the marketplace upload wizard (creationSource: MARKETPLACE_UPLOAD). V2's Font
 * Lab becomes a second caller of the exact same function — it takes structured
 * font data, not "a file the user uploaded through a form", so the marketplace
 * never needs to know how the Font was produced.
 */
export const FontPublishingService = {
  async createDraftFont(input: DraftFontInput) {
    await connectDB();

    const category = await CategoryModel.findById(input.categoryId).lean();
    if (!category) throw new Error("Category not found.");
    const designer = await DesignerProfileModel.findById(input.designerId).lean();
    if (!designer) throw new Error("Designer profile not found.");

    const baseSlug = slugify(input.name, { lower: true, strict: true });
    const slug = `${baseSlug}-${nanoid(6)}`;

    const font = await FontModel.create({
      slug,
      name: input.name,
      designer: input.designerId,
      productType: input.productType,
      creationSource: input.creationSource,
      description: input.description,
      category: input.categoryId,
      tags: input.tagIds,
      languages: input.languages,
      glyphCount: input.glyphCount,
      basePriceCents: 0,
      status: "DRAFT",
      designerName: designer.displayName,
      categoryName: category.name,
      seo: {
        title: `${input.name} — Glyphora`,
        description: input.description.slice(0, 155),
      },
    });

    return font;
  },

  async submitForReview(fontId: string) {
    await connectDB();
    const font = await FontModel.findById(fontId);
    if (!font) throw new Error("Font not found.");
    if (!["DRAFT", "REJECTED"].includes(font.status)) {
      throw new Error(`Cannot submit a font in status ${font.status} for review.`);
    }
    font.status = "PENDING_REVIEW";
    font.rejectionReason = null;
    await font.save();
    return font;
  },

  // ── Additions below this line: designer upload wizard support ──────────
  // (createDraftFont/submitForReview above are the original foundation-phase
  // functions and are left untouched; see docs/agent-reports/designer-experience.md)

  /**
   * Loads a font and throws a proper ApiError (404/403/409) if it isn't this
   * designer's own DRAFT/REJECTED font — the shared precondition for every
   * wizard mutation (metadata PATCH, file upload registration, submit-time
   * validation). Centralized here so the ownership+status rule can't drift
   * between route handlers.
   */
  async assertEditableDraft(fontId: string, designerId: string) {
    await connectDB();
    const font = await FontModel.findById(fontId);
    if (!font) throw ApiError.notFound("Font not found.");
    if (font.designer.toString() !== designerId) throw ApiError.forbidden();
    if (!["DRAFT", "REJECTED"].includes(font.status)) {
      throw ApiError.conflict(`This font can't be edited while it's ${font.status.replace("_", " ").toLowerCase()}.`);
    }
    return font;
  },

  /** PATCH /api/seller/fonts/[id] — applies one wizard step's worth of fields. */
  async updateDraftFont(
    fontId: string,
    designerId: string,
    patch: {
      name?: string;
      description?: string;
      categoryId?: string;
      tagIds?: string[];
      languages?: string[];
      glyphCount?: number;
      previewText?: string;
      basePriceCents?: number;
      currency?: string;
      licenseIds?: string[];
    }
  ) {
    await connectDB();
    const font = await this.assertEditableDraft(fontId, designerId);

    if (patch.categoryId) {
      const category = await CategoryModel.findById(patch.categoryId).lean();
      if (!category) throw ApiError.validation("Choose a valid category.", { categoryId: ["Category not found."] });
      font.category = category._id as unknown as typeof font.category;
      font.categoryName = category.name;
    }
    if (patch.tagIds) {
      const tagDocs = await TagModel.find({ _id: { $in: patch.tagIds } })
        .select("name")
        .lean();
      font.tags = patch.tagIds as unknown as typeof font.tags;
      font.tagNames = tagDocs.map((t) => t.name);
    }
    if (patch.licenseIds) {
      const validLicenses = await FontLicenseModel.find({ _id: { $in: patch.licenseIds }, isActive: true })
        .select("_id")
        .lean();
      if (validLicenses.length !== patch.licenseIds.length) {
        throw ApiError.validation("One or more selected licenses are no longer available.", {
          licenseIds: ["Refresh and try again."],
        });
      }
      font.licenses = patch.licenseIds as unknown as typeof font.licenses;
    }

    if (patch.name !== undefined) {
      font.name = patch.name;
      if (font.seo) font.seo.title = `${patch.name} — Glyphora`;
    }
    if (patch.description !== undefined) {
      font.description = patch.description;
      if (font.seo) font.seo.description = patch.description.slice(0, 155);
    }
    if (patch.languages !== undefined) font.languages = patch.languages;
    if (patch.glyphCount !== undefined) font.glyphCount = patch.glyphCount;
    if (patch.previewText !== undefined) font.previewText = patch.previewText;
    if (patch.basePriceCents !== undefined) font.basePriceCents = patch.basePriceCents;
    if (patch.currency !== undefined) font.currency = patch.currency;

    await font.save();
    return font;
  },

  /**
   * POST /api/seller/fonts/[id]/files — registers a FontFile row for a key the
   * client already PUT the bytes to via a presigned URL, and validates it
   * server-side (magic bytes + opentype.js parse — never trust the client's
   * declared format, docs/ARCHITECTURE.md §6). Invalid uploads are deleted from
   * storage immediately rather than left as orphaned objects.
   */
  async registerFontFile(
    fontId: string,
    designerId: string,
    uploadedByUserId: string,
    input: {
      storageKey: string;
      purpose: FontFilePurpose;
      format: FontFormat;
      variantId?: string;
      originalFilename: string;
    }
  ) {
    await connectDB();
    await this.assertEditableDraft(fontId, designerId);

    const bucket: StorageBucket = input.purpose === "PREVIEW" ? "previews" : "deliverables";
    const validation = await FontFileService.validateUploadedObject(bucket, input.storageKey, input.format);

    if (!validation.valid) {
      await StorageService.deleteObject(bucket, input.storageKey);
      throw ApiError.validation(validation.reason, { file: [validation.reason] });
    }

    const file = await FontFileModel.create({
      font: fontId,
      variant: input.variantId ?? null,
      purpose: input.purpose,
      format: input.format,
      storageKey: input.storageKey,
      fileSizeBytes: validation.fileSizeBytes,
      checksumSha256: validation.checksumSha256,
      originalFilename: input.originalFilename,
      uploadedBy: uploadedByUserId,
      validated: true,
    });

    // Auto-create a single default variant the first time a PREVIEW file lands,
    // so the storefront's variant metadata isn't empty — the wizard doesn't
    // expose variant/weight management in V1 (documented simplification, see
    // docs/agent-reports/designer-experience.md).
    if (input.purpose === "PREVIEW") {
      const existingVariant = await FontVariantModel.findOne({ font: fontId });
      if (!existingVariant) {
        await FontVariantModel.create({
          font: fontId,
          name: "Regular",
          weight: 400,
          style: "normal",
          isDefault: true,
          previewFontFile: file._id,
        });
      } else if (!existingVariant.previewFontFile) {
        existingVariant.previewFontFile = file._id as unknown as typeof existingVariant.previewFontFile;
        await existingVariant.save();
      }

      // Prefill glyphCount from the parsed font if the designer hasn't set one yet.
      const font = await FontModel.findById(fontId);
      if (font && !font.glyphCount) {
        font.glyphCount = validation.glyphCount;
        await font.save();
      }
    }

    return { file, validation };
  },

  /**
   * Read-only checklist used by both the Review step (client display) and the
   * submit route (server-side gate) so "all required steps are complete" per
   * docs/API_CONTRACTS.md is defined exactly once.
   */
  async getSubmissionChecklist(fontId: string) {
    await connectDB();
    const font = await FontModel.findById(fontId).lean();
    if (!font) throw ApiError.notFound("Font not found.");

    const [deliverableCount, previewCount] = await Promise.all([
      FontFileModel.countDocuments({ font: fontId, purpose: "DELIVERABLE", validated: true }),
      FontFileModel.countDocuments({ font: fontId, purpose: "PREVIEW", validated: true }),
    ]);

    const checks = {
      hasName: font.name.trim().length >= 2 && font.name !== "Untitled font",
      hasDescription: font.description.trim().length >= 20,
      hasCategory: !!font.category,
      hasTags: font.tags.length >= 1,
      hasDeliverableFile: deliverableCount >= 1,
      hasPreviewFile: previewCount >= 1,
      hasPrice: font.basePriceCents >= 100,
      hasLicense: font.licenses.length >= 1,
    };

    const missing = Object.entries(checks)
      .filter(([, ok]) => !ok)
      .map(([key]) => key);

    return { ready: missing.length === 0, checks, missing };
  },
};
