import type { Metadata } from "next";
import { PayoutRequestForm } from "@/components/seller/payout-request-form";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Wallet } from "lucide-react";
import { requireDesignerProfileId } from "@/server/lib/session";
import { connectDB } from "@/server/lib/db";
import { TransactionModel } from "@/server/models/transaction.model";
import { PayoutModel } from "@/server/models/payout.model";
import { SiteSettingModel } from "@/server/models/site-setting.model";
import { SellerEarningsService } from "@/server/services/seller-earnings.service";

export const metadata: Metadata = { title: "Earnings" };

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

const PAYOUT_BADGE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  REQUESTED: "secondary",
  PROCESSING: "secondary",
  PAID: "default",
  REJECTED: "destructive",
};

export default async function SellerEarningsPage() {
  const { designerProfileId } = await requireDesignerProfileId();
  await connectDB();

  const [balance, minSetting, transactions, payouts] = await Promise.all([
    SellerEarningsService.getBalance(designerProfileId),
    SiteSettingModel.findOne({ key: "payout.minimumAmountCents" }).lean(),
    TransactionModel.find({ designer: designerProfileId }).sort({ createdAt: -1 }).limit(50).lean(),
    PayoutModel.find({ designer: designerProfileId }).sort({ requestedAt: -1 }).lean(),
  ]);
  const minimumAmountCents = typeof minSetting?.value === "number" ? minSetting.value : 5000;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Earnings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your balance and payout history. &quot;Available&quot; is every sale not yet attached to a payout request.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Available</p>
          <p className="mt-1 font-display text-3xl tracking-tight">{formatCents(balance.availableCents)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="mt-1 font-display text-3xl tracking-tight text-muted-foreground">
            {formatCents(balance.pendingCents)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">No hold period in V1 — sales are available immediately.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Paid out</p>
          <p className="mt-1 font-display text-3xl tracking-tight">{formatCents(balance.paidCents)}</p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 font-medium">Request a payout</h2>
        <PayoutRequestForm availableCents={balance.availableCents} minimumAmountCents={minimumAmountCents} />
      </div>

      <div className="mt-10">
        <h2 className="mb-4 font-medium">Payout requests</h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payout requests yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payouts.map((p) => (
                  <tr key={p._id.toString()}>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(p.requestedAt)}</td>
                    <td className="px-4 py-3 font-medium">{formatCents(p.amountCents)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={PAYOUT_BADGE[p.status] ?? "outline"}>{p.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="mb-4 font-medium">Transaction history</h2>
        {transactions.length === 0 ? (
          <EmptyState icon={Wallet} title="No transactions yet" description="Sales will appear here as they happen." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Gross</th>
                  <th className="px-4 py-3">Platform fee</th>
                  <th className="px-4 py-3 text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((t) => (
                  <tr key={t._id.toString()}>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(t.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-normal">
                        {t.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatCents(t.grossAmountCents)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatCents(t.platformFeeCents)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCents(t.netAmountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
