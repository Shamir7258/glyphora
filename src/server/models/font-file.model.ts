import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";
import { FONT_FORMAT, FONT_FILE_PURPOSE } from "@/types/enums";

const fontFileSchema = new Schema(
  {
    font: { type: Types.ObjectId, ref: "Font", required: true, index: true },
    variant: { type: Types.ObjectId, ref: "FontVariant", default: null },
    purpose: { type: String, enum: FONT_FILE_PURPOSE, required: true },
    format: { type: String, enum: FONT_FORMAT, required: true },
    storageKey: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    checksumSha256: { type: String, required: true },
    originalFilename: { type: String, required: true },
    uploadedBy: { type: Types.ObjectId, ref: "User", required: true },
    validated: { type: Boolean, default: false },
    validationNotes: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

fontFileSchema.index({ font: 1, purpose: 1 });

export type FontFileDoc = InferSchemaType<typeof fontFileSchema>;
export const FontFileModel: Model<FontFileDoc> = models.FontFile ?? model<FontFileDoc>("FontFile", fontFileSchema);
