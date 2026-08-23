import { z } from "zod";
import { PRODUCT_TYPE } from "@/types/enums";

/** Shared query-param schema for GET /api/fonts, /api/search, and the discovery pages. */
export const discoveryQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  tag: z.string().trim().max(100).optional(),
  tags: z.string().trim().max(300).optional(), // comma-separated slugs
  type: z.enum(PRODUCT_TYPE).optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  license: z.string().trim().max(40).optional(),
  sort: z.enum(["newest", "popular", "price_asc", "price_desc", "relevance"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});
export type DiscoveryQueryInput = z.infer<typeof discoveryQuerySchema>;
