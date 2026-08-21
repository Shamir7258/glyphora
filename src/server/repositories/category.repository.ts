import { connectDB } from "@/server/lib/db";
import { CategoryModel } from "@/server/models/category.model";
import type { CategoryDTO } from "@/types/dto";

export const CategoryRepository = {
  async listActive(): Promise<CategoryDTO[]> {
    await connectDB();
    const docs = await CategoryModel.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
    return docs.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      slug: c.slug,
      description: c.description,
      icon: c.icon ?? undefined,
    }));
  },
};
