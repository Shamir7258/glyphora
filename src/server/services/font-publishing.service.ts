import { connectDB } from "@/server/lib/db";
import { FontModel } from "@/server/models/font.model";
import { CategoryModel } from "@/server/models/category.model";
import { DesignerProfileModel } from "@/server/models/designer-profile.model";
import slugify from "slugify";
import { nanoid } from "nanoid";
import type { CreationSource, ProductType } from "@/types/enums";

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
};
