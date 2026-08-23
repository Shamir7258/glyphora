import { z } from "zod";

export const createCollectionSchema = z.object({
  name: z.string().trim().min(2, "Give your collection a name").max(80),
  description: z.string().trim().max(500).optional(),
  isPublic: z.coerce.boolean().default(false),
});
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

export const collectionFontSchema = z.object({
  fontId: z.string().min(1),
});
export type CollectionFontInput = z.infer<typeof collectionFontSchema>;
