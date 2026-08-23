import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { addFavoriteSchema } from "@/types/schemas/favorite.schema";
import { FavoriteRepository } from "@/server/repositories/favorite.repository";
import { requireSession } from "@/server/lib/session";

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  const body = await request.json();
  const input = addFavoriteSchema.parse(body);

  const favorite = await FavoriteRepository.create(session.user.id, input.fontId, input.collectionId);
  return apiOk(favorite, 201);
});
