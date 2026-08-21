import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const fontLicenseSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    priceMultiplier: { type: Number, required: true, min: 0 },
    allowedUsage: { type: [String], default: [] },
    restrictions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type FontLicenseDoc = InferSchemaType<typeof fontLicenseSchema>;
export const FontLicenseModel: Model<FontLicenseDoc> =
  models.FontLicense ?? model<FontLicenseDoc>("FontLicense", fontLicenseSchema);
