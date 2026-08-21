import Link from "next/link";
import { AdminFontRepository } from "@/server/repositories/admin-font.repository";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatMoney, formatDate } from "@/components/admin/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FONT_STATUS } from "@/types/enums";

export const metadata = { title: "Font Moderation — Glyphora Admin" };

const FILTERS = [{ value: undefined, label: "All (pending first)" }, ...FONT_STATUS.map((s) => ({ value: s, label: s.replaceAll("_", " ") }))];

export default async function AdminFontsPage({
  searchParams,
}: PageProps<"/admin/fonts">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && (FONT_STATUS as readonly string[]).includes(sp.status) ? sp.status : undefined;
  const page = Number(sp.page ?? 1);

  const result = await AdminFontRepository.list({ status: status as (typeof FONT_STATUS)[number] | undefined, page, limit: 20 });

  return (
    <div>
      <AdminPageHeader
        title="Font moderation"
        description="Review submissions, then approve, reject, suspend, or archive."
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const isActive = status === f.value;
          const href = f.value ? `/admin/fonts?status=${f.value}` : "/admin/fonts";
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
              <TableHead>Font</TableHead>
              <TableHead>Designer</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No fonts match this filter.
                </TableCell>
              </TableRow>
            )}
            {result.items.map((font) => (
              <TableRow key={font.id}>
                <TableCell className="font-medium whitespace-normal">{font.name}</TableCell>
                <TableCell className="whitespace-normal">
                  {font.designer.displayName}
                  {font.designer.isPlatform && (
                    <Badge variant="secondary" className="ml-1.5 font-normal">
                      Platform
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">{font.category.name}</TableCell>
                <TableCell>
                  <StatusBadge status={font.status} />
                </TableCell>
                <TableCell>{formatMoney(font.basePriceCents, font.currency)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(font.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/fonts/${font.id}`} className="text-sm font-medium text-primary hover:underline">
                    Review
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AdminPagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/admin/fonts"
        searchParams={{ status }}
      />
    </div>
  );
}
