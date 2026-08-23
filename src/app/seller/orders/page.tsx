import type { Metadata } from "next";
// Ensures every model is registered before .populate() resolves refs by name
// (Font/FontLicense/Order here) — see src/server/models/index.ts.
import "@/server/models";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ShoppingBag } from "lucide-react";
import { requireDesignerProfileId } from "@/server/lib/session";
import { connectDB } from "@/server/lib/db";
import { OrderItemModel } from "@/server/models/order-item.model";

export const metadata: Metadata = { title: "Orders" };

const LIMIT = 25;

function formatPrice(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

export default async function SellerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { designerProfileId } = await requireDesignerProfileId();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  await connectDB();

  const [items, total] = await Promise.all([
    OrderItemModel.find({ designer: designerProfileId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * LIMIT)
      .limit(LIMIT)
      .populate("font", "name slug")
      .populate("license", "name")
      .populate("order", "orderNumber status customerInfo createdAt")
      .lean(),
    OrderItemModel.countDocuments({ designer: designerProfileId }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every sale that included one of your fonts.</p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No sales yet"
          description="Once a customer buys one of your fonts, it'll show up here."
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Font</th>
                  <th className="px-4 py-3">License</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Your share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => {
                  const font = item.font as unknown as { name: string; slug: string } | null;
                  const license = item.license as unknown as { name: string } | null;
                  const order = item.order as unknown as {
                    orderNumber: string;
                    status: string;
                    customerInfo: { name: string };
                    createdAt: Date;
                  } | null;
                  return (
                    <tr key={item._id.toString()}>
                      <td className="px-4 py-3 font-mono text-xs">{order?.orderNumber ?? "—"}</td>
                      <td className="px-4 py-3">{font?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{license?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{order?.customerInfo?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {order ? formatDate(new Date(order.createdAt)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Badge variant={order?.status === "PAID" ? "default" : "secondary"} className="font-normal">
                            {order?.status ?? "—"}
                          </Badge>
                          <span className="font-medium">{formatPrice(item.designerShareCents)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              {page > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/seller/orders?page=${page - 1}`}>Previous</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/seller/orders?page=${page + 1}`}>Next</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
