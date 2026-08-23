import { connectDB } from "@/server/lib/db";
import { ReviewModel } from "@/server/models/review.model";
import { UserModel } from "@/server/models/user.model";
import { OrderRepository } from "@/server/repositories/order.repository";
import { ApiError } from "@/types/errors";
import type { ReviewDTO } from "@/types/dto";

export const ReviewRepository = {
  async listForFont(fontId: string): Promise<ReviewDTO[]> {
    await connectDB();
    const docs = await ReviewModel.find({ font: fontId, status: "PUBLISHED" })
      .sort({ createdAt: -1 })
      .populate<{ user: { _id: unknown; name: string; avatarUrl?: string | null } }>({
        path: "user",
        select: "name avatarUrl",
      });

    return docs.map((d) => ({
      id: d._id.toString(),
      font: d.font.toString(),
      user: { id: (d.user._id as { toString(): string }).toString(), name: d.user.name, avatarUrl: d.user.avatarUrl ?? undefined },
      rating: d.rating,
      comment: d.comment ?? "",
      createdAt: d.createdAt ? d.createdAt.toISOString() : new Date().toISOString(),
    }));
  },

  async summaryForFont(fontId: string): Promise<{ average: number; count: number }> {
    await connectDB();
    const docs = await ReviewModel.find({ font: fontId, status: "PUBLISHED" }).select("rating").lean();
    if (docs.length === 0) return { average: 0, count: 0 };
    const average = docs.reduce((sum, d) => sum + d.rating, 0) / docs.length;
    return { average: Math.round(average * 10) / 10, count: docs.length };
  },

  async create(userId: string, fontId: string, rating: number, comment?: string): Promise<ReviewDTO> {
    await connectDB();
    const orderId = await OrderRepository.findPaidOrderIdForUserAndFont(userId, fontId);
    if (!orderId) throw ApiError.forbidden("You can only review fonts you've purchased.");

    const existing = await ReviewModel.findOne({ font: fontId, user: userId });
    if (existing) throw ApiError.conflict("You've already reviewed this font.");

    const doc = await ReviewModel.create({ font: fontId, user: userId, order: orderId, rating, comment: comment ?? "" });
    const user = await UserModel.findById(userId).select("name avatarUrl").lean();

    return {
      id: doc._id.toString(),
      font: fontId,
      user: { id: userId, name: user?.name ?? "Customer", avatarUrl: user?.avatarUrl ?? undefined },
      rating: doc.rating,
      comment: doc.comment ?? "",
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
    };
  },
};
