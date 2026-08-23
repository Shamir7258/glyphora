import { apiOk, withApiHandler } from "@/types/api";
import { FontRepository } from "@/server/repositories/font.repository";
import { ApiError } from "@/types/errors";

export const GET = withApiHandler(async (_request: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const font = await FontRepository.findPublishedBySlug(slug);
  if (!font) throw ApiError.notFound("We couldn't find that font.");

  // Fire-and-forget analytics counter — never block the response on it.
  void FontRepository.incrementViewCount(font._id.toString());

  return apiOk(await FontRepository.toDetailDTO(font));
});
