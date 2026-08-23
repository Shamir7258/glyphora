import { z } from "zod";

export const addFavoriteSchema = z.object({
  fontId: z.string().min(1),
  collectionId: z.string().optional(),
});
export type AddFavoriteInput = z.infer<typeof addFavoriteSchema>;
