import { connectDB } from "@/server/lib/db";
import { OrderModel } from "@/server/models/order.model";
import { OrderItemModel } from "@/server/models/order-item.model";
import { PaymentModel } from "@/server/models/payment.model";
import type { OrderStatus } from "@/types/enums";

export type AdminOrderListItemDTO = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  itemCount: number;
  grandTotalCents: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
};

export type AdminOrderDetailDTO = AdminOrderListItemDTO & {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  items: {
    id: string;
    fontName: string;
    licenseName: string;
    designerName: string;
    unitPriceCents: number;
    lineTotalCents: number;
    commissionPercentageAtSale: number;
    designerShareCents: number;
    platformFeeCents: number;
    downloadGranted: boolean;
  }[];
  payment: { provider: string; status: string; providerSessionId: string; providerPaymentId: string | null } | null;
};

export const AdminOrderRepository = {
  async list(params: { page?: number; limit?: number; status?: OrderStatus; q?: string }) {
    await connectDB();
    const limit = params.limit ?? 20;
    const page = params.page ?? 1;
    const filter: Record<string, unknown> = {};
    if (params.status) filter.status = params.status;
    if (params.q) {
      filter.$or = [
        { orderNumber: { $regex: params.q, $options: "i" } },
        { "customerInfo.email": { $regex: params.q, $options: "i" } },
        { "customerInfo.name": { $regex: params.q, $options: "i" } },
      ];
    }

    const [docs, total] = await Promise.all([
      OrderModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      OrderModel.countDocuments(filter),
    ]);

    const items: AdminOrderListItemDTO[] = docs.map((o) => ({
      id: String(o._id),
      orderNumber: o.orderNumber,
      customerName: o.customerInfo?.name ?? "—",
      customerEmail: o.customerInfo?.email ?? "—",
      itemCount: o.items.length,
      grandTotalCents: o.grandTotalCents,
      currency: o.currency,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    }));

    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  },

  async getDetail(id: string): Promise<AdminOrderDetailDTO | null> {
    await connectDB();
    const order = await OrderModel.findById(id).lean();
    if (!order) return null;

    const [items, payment] = await Promise.all([
      OrderItemModel.find({ order: order._id })
        .populate([
          { path: "font", select: "name" },
          { path: "license", select: "name" },
          { path: "designer", select: "displayName" },
        ])
        .lean(),
      order.payment ? PaymentModel.findById(order.payment).lean() : null,
    ]);

    return {
      id: String(order._id),
      orderNumber: order.orderNumber,
      customerName: order.customerInfo?.name ?? "—",
      customerEmail: order.customerInfo?.email ?? "—",
      itemCount: items.length,
      grandTotalCents: order.grandTotalCents,
      currency: order.currency,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      subtotalCents: order.subtotalCents,
      discountCents: order.discountCents,
      taxCents: order.taxCents,
      items: items.map((it) => {
        const doc = it as unknown as {
          _id: unknown;
          font: { name: string } | null;
          license: { name: string } | null;
          designer: { displayName: string } | null;
          unitPriceCents: number;
          lineTotalCents: number;
          commissionPercentageAtSale: number;
          designerShareCents: number;
          platformFeeCents: number;
          downloadGranted: boolean;
        };
        return {
          id: String(doc._id),
          fontName: doc.font?.name ?? "(deleted font)",
          licenseName: doc.license?.name ?? "—",
          designerName: doc.designer?.displayName ?? "—",
          unitPriceCents: doc.unitPriceCents,
          lineTotalCents: doc.lineTotalCents,
          commissionPercentageAtSale: doc.commissionPercentageAtSale,
          designerShareCents: doc.designerShareCents,
          platformFeeCents: doc.platformFeeCents,
          downloadGranted: doc.downloadGranted,
        };
      }),
      payment: payment
        ? {
            provider: payment.provider,
            status: payment.status,
            providerSessionId: payment.providerSessionId,
            providerPaymentId: payment.providerPaymentId ?? null,
          }
        : null,
    };
  },
};
