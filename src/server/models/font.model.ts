import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";
import { FONT_STATUS, PRODUCT_TYPE, CREATION_SOURCE } from "@/types/enums";

const openTypeFeatureSchema = new Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    sampleText: { type: String, default: "" },
  },
  { _id: false }
);

const fontSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    designer: { type: Types.ObjectId, ref: "DesignerProfile", required: true },
    productType: { type: String, enum: PRODUCT_TYPE, required: true },
    creationSource: { type: String, enum: CREATION_SOURCE, default: "MARKETPLACE_UPLOAD" },
    description: { type: String, default: "" },
    category: { type: Types.ObjectId, ref: "Category", required: true },
    tags: { type: [Types.ObjectId], ref: "Tag", default: [] },
    // Which FontLicense templates this font is sold under (spec §12 wizard step 5).
    // Empty array = not yet configured by the designer; storefront/cart should
    // fall back to "all active licenses" in that case for backward compatibility
    // with fonts created before this field existed (see docs/agent-reports).
    licenses: { type: [Types.ObjectId], ref: "FontLicense", default: [] },
    languages: { type: [String], default: ["English"] },
    glyphCount: { type: Number, default: 0 },
    basePriceCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    previewText: { type: String, default: "Type something" },
    previewImageUrl: { type: String, default: null },
    openTypeFeatures: { type: [openTypeFeatureSchema], default: [] },
    status: { type: String, enum: FONT_STATUS, default: "DRAFT", index: true },
    rejectionReason: { type: String, default: null },
    reviewedBy: { type: Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    salesCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    favoriteCount: { type: Number, default: 0 },
    seo: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      ogImage: { type: String, default: null },
    },
    // Denormalized for Atlas/local search — kept in sync by the font repository.
    designerName: { type: String, default: "" },
    categoryName: { type: String, default: "" },
    tagNames: { type: [String], default: [] },
  },
  { timestamps: true }
);

fontSchema.index({ status: 1, publishedAt: -1 });
fontSchema.index({ designer: 1 });
fontSchema.index({ category: 1 });
fontSchema.index({ productType: 1, status: 1 });
fontSchema.index({ name: "text", description: "text", tagNames: "text" });

export type FontDoc = InferSchemaType<typeof fontSchema>;
export const FontModel: Model<FontDoc> = models.Font ?? model<FontDoc>("Font", fontSchema);
