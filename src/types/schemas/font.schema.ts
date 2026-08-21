import { z } from "zod";
import { FONT_FORMAT, FONT_FILE_PURPOSE } from "@/types/enums";

export const fontDetailsSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().trim().min(20, "Tell customers about this font (min 20 characters)").max(4000),
  categoryId: z.string().min(1, "Choose a category"),
  tagIds: z.array(z.string()).min(1, "Add at least one tag").max(10),
  languages: z.array(z.string()).min(1, "Select at least one supported language"),
  glyphCount: z.coerce.number().int().min(1).max(65535),
});
export type FontDetailsInput = z.infer<typeof fontDetailsSchema>;

export const fontPreviewSchema = z.object({
  previewText: z.string().trim().min(1).max(200).default("Type something"),
});
export type FontPreviewInput = z.infer<typeof fontPreviewSchema>;

export const fontPricingSchema = z.object({
  basePriceCents: z.coerce.number().int().min(100, "Minimum price is $1.00").max(10_000_00),
  currency: z.string().length(3).default("USD"),
});
export type FontPricingInput = z.infer<typeof fontPricingSchema>;

export const fontLicenseSelectionSchema = z.object({
  licenseIds: z.array(z.string()).min(1, "Select at least one license type"),
});
export type FontLicenseSelectionInput = z.infer<typeof fontLicenseSelectionSchema>;

export const uploadUrlRequestSchema = z.object({
  purpose: z.enum(FONT_FILE_PURPOSE),
  format: z.enum(FONT_FORMAT),
  variantId: z.string().optional(),
  filename: z.string().trim().min(1).max(255),
});
export type UploadUrlRequestInput = z.infer<typeof uploadUrlRequestSchema>;

export const registerFileSchema = z.object({
  storageKey: z.string().min(1),
  purpose: z.enum(FONT_FILE_PURPOSE),
  format: z.enum(FONT_FORMAT),
  variantId: z.string().optional(),
  originalFilename: z.string().min(1),
});
export type RegisterFileInput = z.infer<typeof registerFileSchema>;

export const adminRejectSchema = z.object({
  reason: z.string().trim().min(10, "Give the designer a specific reason (min 10 characters)").max(1000),
});
export type AdminRejectInput = z.infer<typeof adminRejectSchema>;
