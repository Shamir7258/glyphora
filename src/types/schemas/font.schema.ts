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

// `mode` distinguishes "Reject" from "Request changes" for tone/audit-log labeling
// only — both write FontStatus 'REJECTED' so the designer's existing resubmit path
// (FontPublishingService.submitForReview allows DRAFT|REJECTED -> PENDING_REVIEW)
// keeps working unmodified. See docs/agent-reports/admin-panel.md for the full
// rationale.
export const adminRejectSchema = z.object({
  reason: z.string().trim().min(10, "Give the designer a specific reason (min 10 characters)").max(1000),
  mode: z.enum(["REJECT", "REQUEST_CHANGES"]).default("REJECT"),
});
export type AdminRejectInput = z.infer<typeof adminRejectSchema>;

export const adminSuspendSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});
export type AdminSuspendInput = z.infer<typeof adminSuspendSchema>;

// ── Designer upload wizard additions (src/app/seller/**) ────────────────────

/**
 * Kicks off a draft font before any wizard step has real data — the Files step
 * needs a fontId to attach FontFiles to before Details has been filled in, so
 * POST /api/seller/fonts accepts just an optional working name and everything
 * else is filled in progressively via PATCH /api/seller/fonts/[id] (see
 * fontUpdateSchema below), validated in full at submit time.
 */
export const createDraftFontSchema = z.object({
  name: z.string().trim().min(1).max(100).default("Untitled font"),
});
export type CreateDraftFontInput = z.infer<typeof createDraftFontSchema>;

/**
 * PATCH /api/seller/fonts/[id] body — every wizard step after Files (Details,
 * Preview, Pricing, License) submits a subset of these fields; each is
 * individually validated to the same rule as its dedicated schema above, but
 * all optional here since a single PATCH call only ever carries one step's
 * worth of fields.
 */
export const fontUpdateSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
    description: z.string().trim().min(20, "Tell customers about this font (min 20 characters)").max(4000).optional(),
    categoryId: z.string().min(1).optional(),
    tagIds: z.array(z.string()).max(10).optional(),
    languages: z.array(z.string()).optional(),
    glyphCount: z.coerce.number().int().min(0).max(65535).optional(),
    previewText: z.string().trim().min(1).max(200).optional(),
    basePriceCents: z.coerce.number().int().min(100, "Minimum price is $1.00").max(10_000_00).optional(),
    currency: z.string().length(3).optional(),
    licenseIds: z.array(z.string()).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: "No fields to update." });
export type FontUpdateInput = z.infer<typeof fontUpdateSchema>;
