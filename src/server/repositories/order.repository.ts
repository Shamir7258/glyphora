import { connectDB } from "@/server/lib/db";
import { OrderModel, type OrderDoc } from "@/server/models/order.model";
import { OrderItemModel } from "@/server/models/order-item.model";
import { FontLicenseModel } from "@/server/models/font-license.model";
import { FontVariantModel } from "@/server/models/font-variant.model";
import { FontFileModel } from "@/server/models/font-file.model";
import { FontRepository } from "@/server/repositories/font.repository";
import { StorageService } from "@/server/services/storage/storage.service";
import type { HydratedDocument } from "mongoose";
import type { OrderDTO, OrderItemDTO, FontVariantDTO, LicenseDTO } from "@/types/dto";
import type { Paginated } from "@/types/api";

type OrderHydrated = HydratedDocument<OrderDoc>;

export const OrderRepository = {
  async findByOrderNumber(orderNumber: string): Promise<OrderHydrated | null> {
    await connectDB();
    return OrderModel.findOne({ orderNumber: orderNumber.toUpperCase() });
  },

  async findById(id: string): Promise<OrderHydrated | null> {
    await connectDB();
    return OrderModel.findById(id);
  },

  async listForUser(userId: string, page = 1, limit = 20): Promise<Paginated<OrderDTO>> {
    await connectDB();
    const filter = { user: userId, status: "PAID" as const };
    const [docs, total] = await Promise.all([
      OrderModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      OrderModel.countDocuments(filter),
    ]);
    const items = await Promise.all(docs.map((d) => this.toDTO(d)));
    return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
  },

  /** Used by GET /api/downloads and account/downloads — every purchased, download-granted OrderItem for a user. */
  async listPurchasedItemsForUser(userId: string) {
    await connectDB();
    const orders = await OrderModel.find({ user: userId, status: "PAID" }).select("_id orderNumber createdAt");
    const orderIds = orders.map((o) => o._id);
    const orderById = new Map(orders.map((o) => [o._id.toString(), o]));

    const items = await OrderItemModel.find({ order: { $in: orderIds }, downloadGranted: true }).sort({
      createdAt: -1,
    });

    const results = [];
    for (const item of items) {
      const font = await FontRepository.findByIdUnfiltered(item.font.toString());
      if (!font) continue;
      const files = await FontFileModel.find({ font: item.font, purpose: "DELIVERABLE" }).lean();
      const order = orderById.get(item.order.toString());
      results.push({
        orderItemId: item._id.toString(),
        orderNumber: order?.orderNumber ?? "",
        purchasedAt: order?.createdAt ? order.createdAt.toISOString() : new Date().toISOString(),
        font: await FontRepository.toSummaryDTO(font),
        files: files.map((f) => ({ id: f._id.toString(), format: f.format, originalFilename: f.originalFilename })),
      });
    }
    return results;
  },

  /** For review eligibility: does this user have a PAID order containing this font? Returns the order id or null. */
  async findPaidOrderIdForUserAndFont(userId: string, fontId: string): Promise<string | null> {
    await connectDB();
    const userOrders = await OrderModel.find({ user: userId, status: "PAID" }).select("_id").lean();
    if (userOrders.length === 0) return null;
    const match = await OrderItemModel.findOne({
      font: fontId,
      order: { $in: userOrders.map((o) => o._id) },
    })
      .select("order")
      .lean();
    return match ? match.order.toString() : null;
  },

  /** Deliverable FontFiles available for a given OrderItem's font — used to resolve which file GET /api/downloads/[orderItemId] should issue. */
  async listDeliverableFilesForOrderItem(
    orderItemId: string
  ): Promise<{ id: string; format: string; originalFilename: string }[]> {
    await connectDB();
    const item = await OrderItemModel.findById(orderItemId).select("font").lean();
    if (!item) return [];
    const files = await FontFileModel.find({ font: item.font, purpose: "DELIVERABLE" }).lean();
    return files.map((f) => ({ id: f._id.toString(), format: f.format, originalFilename: f.originalFilename }));
  },

  /** Stripe `checkout.session.expired` — no payment was ever made, leave it distinguishable from a plain abandoned PENDING order. */
  async markExpired(orderId: string): Promise<void> {
    await connectDB();
    const order = await OrderModel.findById(orderId);
    if (!order || order.status !== "PENDING") return;
    order.status = "CANCELLED";
    await order.save();
  },

  /** Stripe `payment_intent.payment_failed`. */
  async markFailed(orderId: string): Promise<void> {
    await connectDB();
    const order = await OrderModel.findById(orderId);
    if (!order || order.status !== "PENDING") return;
    order.status = "FAILED";
    await order.save();
  },

  async toDTO(order: OrderHydrated): Promise<OrderDTO> {
    const orderItems = await OrderItemModel.find({ order: order._id });
    const items: OrderItemDTO[] = [];

    for (const item of orderItems) {
      const font = await FontRepository.findByIdUnfiltered(item.font.toString());
      if (!font) continue;
      const licenseDoc = await FontLicenseModel.findById(item.license).lean();
      if (!licenseDoc) continue;

      let variant: FontVariantDTO | null = null;
      if (item.variant) {
        const variantDoc = await FontVariantModel.findById(item.variant).lean();
        if (variantDoc) {
          let previewFontUrl: string | null = null;
          if (variantDoc.previewFontFile) {
            const file = await FontFileModel.findById(variantDoc.previewFontFile).lean();
            if (file) previewFontUrl = StorageService.getPublicPreviewUrl(file.storageKey);
          }
          variant = {
            id: variantDoc._id.toString(),
            name: variantDoc.name,
            weight: variantDoc.weight,
            style: variantDoc.style as "normal" | "italic",
            isDefault: variantDoc.isDefault,
            previewFontUrl,
          };
        }
      }

      const license: LicenseDTO = {
        id: licenseDoc._id.toString(),
        key: licenseDoc.key,
        name: licenseDoc.name,
        description: licenseDoc.description,
        priceMultiplier: licenseDoc.priceMultiplier,
        allowedUsage: licenseDoc.allowedUsage,
        restrictions: licenseDoc.restrictions,
      };

      items.push({
        id: item._id.toString(),
        font: await FontRepository.toSummaryDTO(font),
        license,
        variant,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.lineTotalCents,
        downloadGranted: item.downloadGranted,
      });
    }

    return {
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      items,
      subtotalCents: order.subtotalCents,
      discountCents: order.discountCents,
      taxCents: order.taxCents,
      grandTotalCents: order.grandTotalCents,
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
    };
  },
};
