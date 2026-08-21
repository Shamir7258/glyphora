import { AdminCouponRepository } from "@/server/repositories/admin-catalog.repository";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CouponFormDialog } from "@/components/admin/coupon-form-dialog";
import { formatMoney } from "@/components/admin/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Coupons — Glyphora Admin" };

export default async function AdminCouponsPage() {
  const coupons = await AdminCouponRepository.list();

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader title="Coupons" description="Discount codes redeemable at checkout." actions={<CouponFormDialog />} />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Applies to</TableHead>
              <TableHead>Redemptions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No coupons yet.
                </TableCell>
              </TableRow>
            )}
            {coupons.map((c) => (
              <TableRow key={String(c._id)}>
                <TableCell className="font-mono text-xs font-medium">{c.code}</TableCell>
                <TableCell>{c.type === "PERCENTAGE" ? `${c.value}%` : formatMoney(c.value)}</TableCell>
                <TableCell className="text-muted-foreground">{c.appliesTo}</TableCell>
                <TableCell>
                  {c.redemptionCount}
                  {c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}
                </TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? "secondary" : "outline"} className="font-normal">
                    {c.isActive ? "Active" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <CouponFormDialog
                    target={{
                      id: String(c._id),
                      code: c.code,
                      type: c.type,
                      value: c.value,
                      appliesTo: c.appliesTo,
                      minSubtotalCents: c.minSubtotalCents,
                      maxRedemptions: c.maxRedemptions ?? undefined,
                      isActive: c.isActive,
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
