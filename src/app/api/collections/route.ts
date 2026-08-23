import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { createCollectionSchema } from "@/types/schemas/collection.schema";
import { CollectionRepository } from "@/server/repositories/collection.repository";
import { requireSession } from "@/server/lib/session";

export const GET = withApiHandler(async () => {
  const session = await requireSession();
  const collections = await CollectionRepository.listForUser(session.user.id);
  return apiOk(collections);
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  const body = await request.json();
  const input = createCollectionSchema.parse(body);
  const collection = await CollectionRepository.create(session.user.id, input);
  return apiOk(collection, 201);
});
