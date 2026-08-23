import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { OrderRepository } from "@/server/repositories/order.repository";
import { requireSession } from "@/server/lib/session";

export const metadata: Metadata = { title: "Billing" };

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export default async function BillingPage() {
  const session = await requireSession();
  const orders = await OrderRepository.listForUser(session.user.id, 1, 50);

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-medium tracking-tight">Billing</h1>
      <p className="mb-6 text-muted-foreground">
        Your order history is your billing history — no separate payment methods to manage in V1.
      </p>

      {orders.items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No billing history yet"
          description="Paid orders will appear here as receipts."
          action={
            <Button asChild size="sm">
              <Link href="/fonts">Browse fonts</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/60 text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Subtotal</th>
                <th className="px-4 py-3 text-right font-medium">Discount</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.items.map((order) => (
                <tr key={order.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Badge variant={order.status === "PAID" ? "default" : "secondary"}>{order.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">{formatPrice(order.subtotalCents, order.currency)}</td>
                  <td className="px-4 py-3 text-right">
                    {order.discountCents > 0 ? `-${formatPrice(order.discountCents, order.currency)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatPrice(order.grandTotalCents, order.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
