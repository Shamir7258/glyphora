import { apiOk, withApiHandler } from "@/types/api";
import { CollectionRepository } from "@/server/repositories/collection.repository";
import { requireSession } from "@/server/lib/session";

export const GET = withApiHandler(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const session = await requireSession();
  const collection = await CollectionRepository.getDetailForUser(id, session.user.id);
  return apiOk(collection);
});
