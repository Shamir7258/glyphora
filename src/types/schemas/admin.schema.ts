import { z } from "zod";
import { COUPON_TYPE, COUPON_APPLIES_TO } from "@/types/enums";

export const commissionUpdateSchema = z.object({
  percentage: z.coerce.number().min(0).max(100),
  note: z.string().trim().max(500).optional(),
});
export type CommissionUpdateInput = z.infer<typeof commissionUpdateSchema>;

export const categoryUpsertSchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().trim().max(300).optional(),
  icon: z.string().trim().max(60).optional(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().default(true),
});
export type CategoryUpsertInput = z.infer<typeof categoryUpsertSchema>;

export const tagUpsertSchema = z.object({
  name: z.string().trim().min(2).max(40),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  kind: z.enum(["CATEGORY_STYLE", "MOOD"]).default("MOOD"),
});
export type TagUpsertInput = z.infer<typeof tagUpsertSchema>;

export const licenseUpsertSchema = z.object({
  key: z.string().trim().toUpperCase().min(2).max(30),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().min(10).max(1000),
  priceMultiplier: z.coerce.number().min(0.1).max(100),
  allowedUsage: z.array(z.string().trim().min(1)).min(1),
  restrictions: z.array(z.string().trim().min(1)).default([]),
  isActive: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});
export type LicenseUpsertInput = z.infer<typeof licenseUpsertSchema>;

export const couponUpsertSchema = z.object({
  code: z.string().trim().toUpperCase().min(3).max(40),
  type: z.enum(COUPON_TYPE),
  value: z.coerce.number().min(0),
  appliesTo: z.enum(COUPON_APPLIES_TO).default("ALL"),
  appliesToRef: z.string().optional(),
  minSubtotalCents: z.coerce.number().int().min(0).default(0),
  maxRedemptions: z.coerce.number().int().min(1).optional(),
  expiresAt: z.coerce.date().optional(),
  isActive: z.coerce.boolean().default(true),
});
export type CouponUpsertInput = z.infer<typeof couponUpsertSchema>;

export const payoutDecisionSchema = z.object({
  status: z.enum(["PROCESSING", "PAID", "REJECTED"]),
  notes: z.string().trim().max(500).optional(),
});
export type PayoutDecisionInput = z.infer<typeof payoutDecisionSchema>;

export const siteSettingUpdateSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});
export type SiteSettingUpdateInput = z.infer<typeof siteSettingUpdateSchema>;
