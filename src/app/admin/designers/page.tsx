import { AdminUserRepository } from "@/server/repositories/admin-user.repository";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminSearchForm } from "@/components/admin/admin-search-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccountStatusAction } from "@/components/admin/account-status-action";
import { formatMoney, formatDate } from "@/components/admin/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Designers — Glyphora Admin" };

export default async function AdminDesignersPage({ searchParams }: PageProps<"/admin/designers">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = Number(sp.page ?? 1);

  const result = await AdminUserRepository.listDesigners({ q, page, limit: 20 });

  return (
    <div>
      <AdminPageHeader title="Designers" description="Third-party and platform designer accounts." />
      <AdminSearchForm basePath="/admin/designers" placeholder="Search by name or username…" defaultValue={q} />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Designer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Fonts</TableHead>
              <TableHead>Sales</TableHead>
              <TableHead>Lifetime revenue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  No designers found.
                </TableCell>
              </TableRow>
            )}
            {result.items.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="whitespace-normal font-medium">
                  {d.displayName}
                  {d.isPlatform && (
                    <Badge variant="secondary" className="ml-1.5 font-normal">
                      Platform
                    </Badge>
                  )}
                  <p className="text-xs font-normal text-muted-foreground">@{d.username}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{d.email}</TableCell>
                <TableCell>{d.fontCount}</TableCell>
                <TableCell>{d.stats.totalSalesCount}</TableCell>
                <TableCell>{formatMoney(d.stats.totalRevenueCents)}</TableCell>
                <TableCell>
                  <StatusBadge status={d.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
                <TableCell className="text-right">
                  {!d.isPlatform && <AccountStatusAction id={d.id} status={d.status} endpoint="designers" />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AdminPagination page={result.page} totalPages={result.totalPages} basePath="/admin/designers" searchParams={{ q }} />
    </div>
  );
}
