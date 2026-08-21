import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { AdminFontRepository } from "@/server/repositories/admin-font.repository";
import { ApiError } from "@/types/errors";

export const GET = withApiHandler(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const font = await AdminFontRepository.getReviewDetail(id);
  if (!font) throw ApiError.notFound("Font not found.");
  return apiOk(font);
});
