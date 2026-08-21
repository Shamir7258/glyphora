import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

const fontVariantSchema = new Schema(
  {
    font: { type: Types.ObjectId, ref: "Font", required: true, index: true },
    name: { type: String, required: true },
    weight: { type: Number, required: true, min: 100, max: 900 },
    style: { type: String, enum: ["normal", "italic"], default: "normal" },
    isDefault: { type: Boolean, default: false },
    previewFontFile: { type: Types.ObjectId, ref: "FontFile", default: null },
  },
  { timestamps: true }
);

export type FontVariantDoc = InferSchemaType<typeof fontVariantSchema>;
export const FontVariantModel: Model<FontVariantDoc> =
  models.FontVariant ?? model<FontVariantDoc>("FontVariant", fontVariantSchema);
