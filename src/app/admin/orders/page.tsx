import Link from "next/link";
import { AdminOrderRepository } from "@/server/repositories/admin-order.repository";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminSearchForm } from "@/components/admin/admin-search-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatMoney, formatDateTime } from "@/components/admin/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ORDER_STATUS } from "@/types/enums";

export const metadata = { title: "Orders — Glyphora Admin" };

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && (ORDER_STATUS as readonly string[]).includes(sp.status) ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = Number(sp.page ?? 1);

  const result = await AdminOrderRepository.list({ status: status as (typeof ORDER_STATUS)[number] | undefined, q, page, limit: 20 });

  return (
    <div>
      <AdminPageHeader title="Orders" description="Every order placed on the marketplace." />
      <AdminSearchForm basePath="/admin/orders" placeholder="Search order #, name, or email…" defaultValue={q} />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {[{ value: undefined, label: "All" }, ...ORDER_STATUS.map((s) => ({ value: s, label: s }))].map((f) => {
          const isActive = status === f.value;
          const params = new URLSearchParams();
          if (f.value) params.set("status", f.value);
          if (q) params.set("q", q);
          const href = `/admin/orders${params.toString() ? `?${params}` : ""}`;
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
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead className="text-right">Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No orders match this filter.
                </TableCell>
              </TableRow>
            )}
            {result.items.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs font-medium">{o.orderNumber}</TableCell>
                <TableCell className="whitespace-normal">
                  {o.customerName}
                  <p className="text-xs text-muted-foreground">{o.customerEmail}</p>
                </TableCell>
                <TableCell>{o.itemCount}</TableCell>
                <TableCell>{formatMoney(o.grandTotalCents, o.currency)}</TableCell>
                <TableCell>
                  <StatusBadge status={o.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(o.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/orders/${o.id}`} className="text-sm font-medium text-primary hover:underline">
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AdminPagination page={result.page} totalPages={result.totalPages} basePath="/admin/orders" searchParams={{ status, q }} />
    </div>
  );
}
