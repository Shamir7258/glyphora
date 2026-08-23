import type { Metadata } from "next";
// Ensures every model is registered before .populate() resolves refs by name
// (Order here) — see src/server/models/index.ts.
import "@/server/models";
import Link from "next/link";
import { Types } from "mongoose";
import { Button } from "@/components/ui/button";
import { FontStatusBadge } from "@/components/seller/font-status-badge";
import { RevenueChart, type RevenuePoint } from "@/components/seller/revenue-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { ShoppingBag } from "lucide-react";
import { requireDesignerProfileId } from "@/server/lib/session";
import { connectDB } from "@/server/lib/db";
import { DesignerProfileModel } from "@/server/models/designer-profile.model";
import { FontModel } from "@/server/models/font.model";
import { OrderItemModel } from "@/server/models/order-item.model";
import { TransactionModel } from "@/server/models/transaction.model";
import { SellerEarningsService } from "@/server/services/seller-earnings.service";

export const metadata: Metadata = { title: "Dashboard" };

const CHART_DAYS = 14;

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

export default async function SellerDashboardPage() {
  const { designerProfileId, session } = await requireDesignerProfileId();
  await connectDB();

  const [profile, topFonts, recentOrders, balance, revenueSeries] = await Promise.all([
    DesignerProfileModel.findById(designerProfileId).lean(),
    FontModel.find({ designer: designerProfileId, status: { $in: ["PUBLISHED", "APPROVED"] } })
      .sort({ salesCount: -1 })
      .limit(5)
      .select("name slug salesCount basePriceCents currency status")
      .lean(),
    OrderItemModel.find({ designer: designerProfileId })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("font", "name")
      .populate("order", "orderNumber customerInfo createdAt")
      .lean(),
    SellerEarningsService.getBalance(designerProfileId),
    getRevenueSeries(designerProfileId),
  ]);

  const stats = profile?.stats ?? { totalProducts: 0, totalSalesCount: 0, totalRevenueCents: 0 };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Welcome back, {session.user.name?.split(" ")[0] ?? "there"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here&apos;s how your fonts are doing.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total sales" value={String(stats.totalSalesCount)} />
        <StatCard label="Lifetime revenue" value={formatCents(stats.totalRevenueCents)} />
        <StatCard label="Available balance" value={formatCents(balance.availableCents)} />
        <StatCard label="Published fonts" value={String(stats.totalProducts)} />
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">Revenue, last {CHART_DAYS} days</h2>
        </div>
        <RevenueChart data={revenueSeries} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">Top-selling fonts</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/seller/fonts">View all</Link>
            </Button>
          </div>
          {topFonts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published fonts yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {topFonts.map((font) => (
                <li key={font._id.toString()} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Link href={`/fonts/${font.slug}`} className="truncate font-medium hover:underline">
                      {font.name}
                    </Link>
                    <div className="mt-0.5">
                      <FontStatusBadge status={font.status} />
                    </div>
                  </div>
                  <span className="shrink-0 text-muted-foreground">{font.salesCount} sold</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">Recent orders</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/seller/orders">View all</Link>
            </Button>
          </div>
          {recentOrders.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="No orders yet" description="Sales will show up here as they happen." />
          ) : (
            <ul className="divide-y divide-border">
              {recentOrders.map((item) => {
                const font = item.font as unknown as { name: string } | null;
                const order = item.order as unknown as { orderNumber: string; createdAt: Date } | null;
                return (
                  <li key={item._id.toString()} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{font?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {order ? formatDate(new Date(order.createdAt)) : "—"}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium">{formatCents(item.designerShareCents)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl tracking-tight">{value}</p>
    </div>
  );
}

async function getRevenueSeries(designerId: string): Promise<RevenuePoint[]> {
  // Mongo's $dateToString groups in UTC by default — the day-key loop below must
  // use UTC methods throughout too, or a non-UTC server timezone (e.g. IST)
  // produces date keys that never match the aggregation's buckets and the chart
  // silently shows all zeros.
  const now = new Date();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  since.setUTCDate(since.getUTCDate() - (CHART_DAYS - 1));

  const rows = await TransactionModel.aggregate<{ _id: string; cents: number }>([
    {
      $match: {
        designer: new Types.ObjectId(designerId),
        type: "SALE",
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        cents: { $sum: "$netAmountCents" },
      },
    },
  ]);
  const byDay = new Map(rows.map((r) => [r._id, r.cents]));

  const points: RevenuePoint[] = [];
  for (let i = 0; i < CHART_DAYS; i++) {
    const day = new Date(since);
    day.setUTCDate(day.getUTCDate() + i);
    const key = day.toISOString().slice(0, 10);
    points.push({
      date: key,
      label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(day),
      cents: byDay.get(key) ?? 0,
    });
  }
  return points;
}
