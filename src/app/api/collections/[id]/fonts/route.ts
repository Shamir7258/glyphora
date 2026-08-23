import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { collectionFontSchema } from "@/types/schemas/collection.schema";
import { CollectionRepository } from "@/server/repositories/collection.repository";
import { requireSession } from "@/server/lib/session";

export const POST = withApiHandler(async (request: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const session = await requireSession();
  const body = await request.json();
  const input = collectionFontSchema.parse(body);
  const collection = await CollectionRepository.addFont(id, session.user.id, input.fontId);
  return apiOk(collection);
});
