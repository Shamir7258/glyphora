import { apiOk, withApiHandler } from "@/types/api";
import { CategoryRepository } from "@/server/repositories/category.repository";

export const GET = withApiHandler(async () => {
  const categories = await CategoryRepository.listActive();
  return apiOk(categories);
});
