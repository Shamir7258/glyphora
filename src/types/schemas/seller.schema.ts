import { z } from "zod";

// New file, scoped to the designer/seller experience (src/app/seller/**,
// src/app/api/seller/**) — see docs/agent-reports/designer-experience.md.

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const designerProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(2, "Name must be at least 2 characters").max(80).optional(),
  bio: z.string().trim().max(600).optional().or(z.literal("")),
  website: optionalUrl,
  avatarUrl: optionalUrl,
  coverImageUrl: optionalUrl,
  socialLinks: z
    .object({
      twitter: optionalUrl,
      instagram: optionalUrl,
      behance: optionalUrl,
      dribbble: optionalUrl,
    })
    .optional(),
  // Intentionally loose per docs/DEVELOPMENT.md — payoutDetails is admin-entered
  // Mixed in the schema, but V1 lets the designer record their own preferred
  // method/destination as free text (e.g. "PayPal: jane@example.com").
  payoutMethod: z.string().trim().max(100).optional().or(z.literal("")),
  payoutDetails: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type DesignerProfileUpdateInput = z.infer<typeof designerProfileUpdateSchema>;

export const payoutRequestSchema = z.object({
  amountCents: z.coerce.number().int().min(1, "Enter an amount"),
});
export type PayoutRequestInput = z.infer<typeof payoutRequestSchema>;
