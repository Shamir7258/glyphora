import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, Heart, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { OrderRepository } from "@/server/repositories/order.repository";
import { FavoriteRepository } from "@/server/repositories/favorite.repository";
import { requireSession } from "@/server/lib/session";

export const metadata: Metadata = { title: "Account" };

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export default async function AccountDashboardPage() {
  const session = await requireSession();
  const [orders, favorites, downloadableItems] = await Promise.all([
    OrderRepository.listForUser(session.user.id, 1, 5),
    FavoriteRepository.list(session.user.id),
    OrderRepository.listPurchasedItemsForUser(session.user.id),
  ]);

  const totalSpentCents = orders.items.reduce((sum, o) => sum + o.grandTotalCents, 0);
  const currency = orders.items[0]?.currency ?? "USD";

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight">Welcome back, {session.user.name}</h1>
        <p className="mt-1 text-muted-foreground">Here&apos;s a snapshot of your Glyphora account.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={ShoppingBag} label="Orders" value={String(orders.total)} />
        <StatCard icon={Download} label="Downloads available" value={String(downloadableItems.length)} />
        <StatCard icon={Heart} label="Favorites" value={String(favorites.length)} />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-medium">Recent purchases</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/account/purchases">
              View all <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
        {orders.items.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No purchases yet"
            description="Fonts you buy will show up here."
            action={
              <Button asChild size="sm">
                <Link href="/fonts">Browse fonts</Link>
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {orders.items.map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.items.length} {order.items.length === 1 ? "font" : "fonts"} ·{" "}
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="font-medium">{formatPrice(order.grandTotalCents, order.currency)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {orders.items.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Total spent so far: <span className="font-medium text-foreground">{formatPrice(totalSpentCents, currency)}</span>
        </p>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="font-display text-xl font-medium">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
