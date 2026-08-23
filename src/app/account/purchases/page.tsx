import type { Metadata } from "next";
import Link from "next/link";
import { Download, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationNav } from "@/components/shared/pagination-nav";
import { OrderRepository } from "@/server/repositories/order.repository";
import { requireSession } from "@/server/lib/session";

export const metadata: Metadata = { title: "Purchases" };

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

const STATUS_LABEL: Record<string, string> = {
  PAID: "Paid",
  PENDING: "Pending",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireSession();
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam ?? "1") || 1;
  const orders = await OrderRepository.listForUser(session.user.id, page, 10);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-medium tracking-tight">Purchases</h1>

      {orders.items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No purchases yet"
          description="Fonts you buy will show up here, with download links for every license."
          action={
            <Button asChild size="sm">
              <Link href="/fonts">Browse fonts</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {orders.items.map((order) => (
            <div key={order.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-4">
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={order.status === "PAID" ? "default" : "secondary"}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </Badge>
                  <span className="font-medium">{formatPrice(order.grandTotalCents, order.currency)}</span>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={`/fonts/${item.font.slug}`} className="truncate font-medium hover:underline">
                        {item.font.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{item.license.name} license</p>
                    </div>
                    {item.downloadGranted && (
                      <Button asChild size="sm" variant="outline">
                        <a href={`/api/downloads/${item.id}`}>
                          <Download className="size-3.5" /> Download
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <PaginationNav basePath="/account/purchases" searchParams={{ page: pageParam }} page={orders.page} totalPages={orders.totalPages} />
    </div>
  );
}
