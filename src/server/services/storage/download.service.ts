import { connectDB } from "@/server/lib/db";
import { OrderItemModel } from "@/server/models/order-item.model";
import { OrderModel } from "@/server/models/order.model";
import { FontFileModel } from "@/server/models/font-file.model";
import { DownloadModel } from "@/server/models/download.model";
import { StorageService } from "@/server/services/storage/storage.service";
import { ApiError } from "@/types/errors";

/**
 * Authorizes and issues a single download. This is the ONLY path that can produce
 * a URL for a DELIVERABLES object — see docs/ARCHITECTURE.md §6. Called from
 * GET /api/downloads/[orderItemId].
 */
export const DownloadService = {
  async authorizeAndIssue(params: {
    userId: string;
    orderItemId: string;
    fontFileId: string;
    ipAddress: string | null;
    userAgent: string | null;
  }) {
    await connectDB();

    const orderItem = await OrderItemModel.findById(params.orderItemId);
    if (!orderItem) throw ApiError.notFound("Order item not found.");

    const order = await OrderModel.findById(orderItem.order);
    if (!order) throw ApiError.notFound("Order not found.");
    if (order.user?.toString() !== params.userId) throw ApiError.forbidden();
    if (order.status !== "PAID") throw ApiError.forbidden("This order hasn't completed payment.");
    if (!orderItem.downloadGranted) throw ApiError.forbidden("Download access wasn't granted for this item.");

    const fontFile = await FontFileModel.findById(params.fontFileId);
    if (!fontFile || fontFile.font.toString() !== orderItem.font.toString()) {
      throw ApiError.notFound("File not found for this purchase.");
    }
    if (fontFile.purpose !== "DELIVERABLE") throw ApiError.forbidden();

    const signedUrl = await StorageService.getSignedDownloadUrl("deliverables", fontFile.storageKey, 300);

    await DownloadModel.create({
      user: params.userId,
      order: order._id,
      orderItem: orderItem._id,
      font: orderItem.font,
      fontFile: fontFile._id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return signedUrl;
  },
};
