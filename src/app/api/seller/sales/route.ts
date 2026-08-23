import type { NextRequest } from "next/server";
// Ensures every model is registered before .populate() resolves refs by name
// (Font/FontLicense/Order here) — see src/server/models/index.ts.
import "@/server/models";
import { apiOk, withApiHandler } from "@/types/api";
import { requireDesignerProfileId } from "@/server/lib/session";
import { connectDB } from "@/server/lib/db";
import { OrderItemModel } from "@/server/models/order-item.model";

/**
 * GET /api/seller/sales?page= — this designer's OrderItems (see
 * docs/API_CONTRACTS.md). Simple enough to query directly per the task brief —
 * no shared repository. src/app/seller/orders/page.tsx queries the same way
 * directly (Server Component reading Mongoose, matching the homepage's
 * pattern) rather than round-tripping through this route; this route exists so
 * the contract is honored for any other/future client-side consumer.
 */
export const GET = withApiHandler(async (request: NextRequest) => {
  const { designerProfileId } = await requireDesignerProfileId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = 20;

  const [items, total] = await Promise.all([
    OrderItemModel.find({ designer: designerProfileId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("font", "name slug")
      .populate("license", "name key")
      .populate("order", "orderNumber status customerInfo createdAt")
      .lean(),
    OrderItemModel.countDocuments({ designer: designerProfileId }),
  ]);

  return apiOk({
    items: items.map((i) => {
      const font = i.font as unknown as { name: string; slug: string } | null;
      const license = i.license as unknown as { name: string; key: string } | null;
      const order = i.order as unknown as {
        orderNumber: string;
        status: string;
        customerInfo: { name: string; email: string };
        createdAt: Date;
      } | null;
      return {
        id: i._id.toString(),
        font: font ? { name: font.name, slug: font.slug } : null,
        license: license ? { name: license.name, key: license.key } : null,
        order: order
          ? {
              orderNumber: order.orderNumber,
              status: order.status,
              customerName: order.customerInfo?.name ?? "",
              createdAt: order.createdAt.toISOString(),
            }
          : null,
        unitPriceCents: i.unitPriceCents,
        lineTotalCents: i.lineTotalCents,
        designerShareCents: i.designerShareCents,
        downloadGranted: i.downloadGranted,
        createdAt: i.createdAt.toISOString(),
      };
    }),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});
