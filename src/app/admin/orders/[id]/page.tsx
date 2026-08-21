import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminOrderRepository } from "@/server/repositories/admin-order.repository";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatMoney, formatDateTime } from "@/components/admin/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const order = await AdminOrderRepository.getDetail(id);
  return { title: order ? `Order ${order.orderNumber} — Glyphora Admin` : "Order — Glyphora Admin" };
}

export default async function AdminOrderDetailPage({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const order = await AdminOrderRepository.getDetail(id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to orders
      </Link>

      <AdminPageHeader
        title={order.orderNumber}
        description={`Placed ${formatDateTime(order.createdAt)} by ${order.customerName} (${order.customerEmail})`}
        actions={<StatusBadge status={order.status} className="text-sm" />}
      />

      <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Font</TableHead>
              <TableHead>License</TableHead>
              <TableHead>Designer</TableHead>
              <TableHead>Unit price</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Designer share</TableHead>
              <TableHead>Platform fee</TableHead>
              <TableHead>Downloaded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium whitespace-normal">{item.fontName}</TableCell>
                <TableCell>{item.licenseName}</TableCell>
                <TableCell className="whitespace-normal">{item.designerName}</TableCell>
                <TableCell>{formatMoney(item.unitPriceCents, order.currency)}</TableCell>
                <TableCell>{item.commissionPercentageAtSale}%</TableCell>
                <TableCell>{formatMoney(item.designerShareCents, order.currency)}</TableCell>
                <TableCell>{formatMoney(item.platformFeeCents, order.currency)}</TableCell>
                <TableCell>{item.downloadGranted ? "Yes" : "No"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 font-display text-base font-semibold">Order totals</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatMoney(order.subtotalCents, order.currency)} />
            <Row label="Discount" value={`-${formatMoney(order.discountCents, order.currency)}`} />
            <Row label="Tax" value={formatMoney(order.taxCents, order.currency)} />
            <Row label="Grand total" value={formatMoney(order.grandTotalCents, order.currency)} strong />
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 font-display text-base font-semibold">Payment</h2>
          {order.payment ? (
            <dl className="space-y-2 text-sm">
              <Row label="Provider" value={order.payment.provider} />
              <Row label="Status" value={order.payment.status} />
              <Row label="Session ID" value={<span className="font-mono text-xs">{order.payment.providerSessionId}</span>} />
              {order.payment.providerPaymentId && (
                <Row label="Payment ID" value={<span className="font-mono text-xs">{order.payment.providerPaymentId}</span>} />
              )}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No payment record yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-semibold" : "font-medium"}>{value}</dd>
    </div>
  );
}
