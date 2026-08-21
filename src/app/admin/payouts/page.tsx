import Link from "next/link";
import { AdminPayoutRepository } from "@/server/repositories/admin-payout.repository";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { PayoutDecisionActions } from "@/components/admin/payout-decision-actions";
import { formatMoney, formatDateTime } from "@/components/admin/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PAYOUT_STATUS } from "@/types/enums";

export const metadata = { title: "Payouts — Glyphora Admin" };

export default async function AdminPayoutsPage({ searchParams }: PageProps<"/admin/payouts">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && (PAYOUT_STATUS as readonly string[]).includes(sp.status) ? sp.status : undefined;
  const page = Number(sp.page ?? 1);

  const result = await AdminPayoutRepository.list({ status: status as (typeof PAYOUT_STATUS)[number] | undefined, page, limit: 20 });

  return (
    <div>
      <AdminPageHeader
        title="Payouts"
        description="Designer payout requests. Marking a payout Paid creates a PAYOUT transaction and settles the designer's oldest unpaid sales up to the amount."
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {[{ value: undefined, label: "All" }, ...PAYOUT_STATUS.map((s) => ({ value: s, label: s }))].map((f) => {
          const isActive = status === f.value;
          const href = f.value ? `/admin/payouts?status=${f.value}` : "/admin/payouts";
          return (
            <Link key={f.label} href={href}>
              <Badge
                variant={isActive ? "default" : "outline"}
                className={cn("cursor-pointer px-2.5 py-1 text-xs font-medium capitalize", !isActive && "hover:bg-muted")}
              >
                {f.label.toLowerCase()}
              </Badge>
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Designer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Processed</TableHead>
              <TableHead className="text-right">Decision</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No payout requests match this filter.
                </TableCell>
              </TableRow>
            )}
            {result.items.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium whitespace-normal">{p.designerName}</TableCell>
                <TableCell>{formatMoney(p.amountCents, p.currency)}</TableCell>
                <TableCell className="text-muted-foreground">{p.method ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={p.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(p.requestedAt)}</TableCell>
                <TableCell className="text-muted-foreground">{p.processedAt ? formatDateTime(p.processedAt) : "—"}</TableCell>
                <TableCell className="text-right">
                  <PayoutDecisionActions payoutId={p.id} status={p.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AdminPagination page={result.page} totalPages={result.totalPages} basePath="/admin/payouts" searchParams={{ status }} />
    </div>
  );
}
