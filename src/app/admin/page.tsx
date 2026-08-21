import Link from "next/link";
import { DollarSign, Receipt, Users, UserCog, Clock } from "lucide-react";
import { AdminDashboardRepository } from "@/server/repositories/admin-dashboard.repository";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { FontStatusBreakdown } from "@/components/admin/font-status-breakdown";
import { formatMoney } from "@/components/admin/format";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Admin Dashboard — Glyphora" };

// Server Component: queries the DB directly via AdminDashboardRepository rather
// than the customer-facing repositories (see task brief — admin views don't need
// to go through those).
export default async function AdminDashboardPage() {
  const summary = await AdminDashboardRepository.getSummary();

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        description="Revenue, orders, and moderation activity across the marketplace."
        actions={
          summary.pendingApprovalCount > 0 ? (
            <Button asChild size="sm">
              <Link href="/admin/fonts?status=PENDING_REVIEW">
                Review {summary.pendingApprovalCount} pending font{summary.pendingApprovalCount === 1 ? "" : "s"}
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Revenue (paid orders)" value={formatMoney(summary.revenueCents)} icon={DollarSign} />
        <StatCard label="Paid orders" value={summary.orderCount.toLocaleString()} icon={Receipt} />
        <StatCard label="Customers" value={summary.customerCount.toLocaleString()} icon={Users} />
        <StatCard label="Designers" value={summary.designerCount.toLocaleString()} icon={UserCog} />
        <StatCard
          label="Pending review"
          value={summary.pendingApprovalCount.toLocaleString()}
          icon={Clock}
          hint={summary.pendingApprovalCount > 0 ? "Needs a decision" : "All caught up"}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-5 xl:col-span-3">
          <h2 className="font-display text-base font-semibold">Revenue, last 6 months</h2>
          <p className="mb-2 text-xs text-muted-foreground">
            Platform fee collected to date: {formatMoney(summary.platformFeeCents)}
          </p>
          <RevenueChart data={summary.revenueByMonth} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5 xl:col-span-2">
          <h2 className="font-display text-base font-semibold">Fonts by status</h2>
          <p className="mb-4 text-xs text-muted-foreground">Across the entire catalog, all designers.</p>
          <FontStatusBreakdown data={summary.fontsByStatus} />
        </div>
      </div>
    </div>
  );
}
