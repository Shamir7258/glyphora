import { connectDB } from "@/server/lib/db";
import { TagModel } from "@/server/models/tag.model";
import type { TagDTO } from "@/types/dto";

export const TagRepository = {
  async listAll(): Promise<TagDTO[]> {
    await connectDB();
    const docs = await TagModel.find().sort({ kind: 1, name: 1 }).lean();
    return docs.map((t) => ({ id: t._id.toString(), name: t.name, slug: t.slug }));
  },
};
