import { z } from "zod";

export const addCartItemSchema = z.object({
  fontId: z.string().min(1),
  licenseId: z.string().min(1),
  variantId: z.string().optional(),
});
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

export const applyCouponSchema = z.object({
  code: z.string().trim().min(1).max(40),
});
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;

export const customerInfoSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});
export type CustomerInfoInput = z.infer<typeof customerInfoSchema>;

export const checkoutSessionSchema = z.object({
  customerInfo: customerInfoSchema,
});
export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;

export const reviewSchema = z.object({
  fontId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});
export type ReviewInput = z.infer<typeof reviewSchema>;
