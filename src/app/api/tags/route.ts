import { apiOk, withApiHandler } from "@/types/api";
import { TagRepository } from "@/server/repositories/tag.repository";

export const GET = withApiHandler(async () => {
  const tags = await TagRepository.listAll();
  return apiOk(tags);
});
