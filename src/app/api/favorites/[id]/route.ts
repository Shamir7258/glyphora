import { apiOk, withApiHandler } from "@/types/api";
import { FavoriteRepository } from "@/server/repositories/favorite.repository";
import { requireSession } from "@/server/lib/session";

export const DELETE = withApiHandler(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const session = await requireSession();
  await FavoriteRepository.remove(id, session.user.id);
  return apiOk({ ok: true as const });
});
