import { apiOk, withApiHandler } from "@/types/api";
import { CollectionRepository } from "@/server/repositories/collection.repository";
import { requireSession } from "@/server/lib/session";

export const DELETE = withApiHandler(
  async (_request: Request, ctx: { params: Promise<{ id: string; fontId: string }> }) => {
    const { id, fontId } = await ctx.params;
    const session = await requireSession();
    const collection = await CollectionRepository.removeFont(id, session.user.id, fontId);
    return apiOk(collection);
  }
);
