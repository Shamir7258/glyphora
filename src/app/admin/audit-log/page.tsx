import Link from "next/link";
import { AuditLogRepository } from "@/server/repositories/audit-log.repository";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { formatDateTime } from "@/components/admin/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "Audit Log — Glyphora Admin" };

export default async function AdminAuditLogPage({ searchParams }: PageProps<"/admin/audit-log">) {
  const sp = await searchParams;
  const entityType = typeof sp.entityType === "string" ? sp.entityType : undefined;
  const page = Number(sp.page ?? 1);

  const result = await AuditLogRepository.list({ entityType, page, limit: 30 });

  return (
    <div>
      <AdminPageHeader
        title="Audit log"
        description="Every mutating admin action — approvals, rejections, status changes, catalog edits, commission and settings updates."
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {[undefined, ...result.entityTypes].map((type) => {
          const isActive = entityType === type;
          const href = type ? `/admin/audit-log?entityType=${type}` : "/admin/audit-log";
          return (
            <Link key={type ?? "all"} href={href}>
              <Badge
                variant={isActive ? "default" : "outline"}
                className={cn("cursor-pointer px-2.5 py-1 text-xs font-medium", !isActive && "hover:bg-muted")}
              >
                {type ?? "All"}
              </Badge>
            </Link>
          );
        })}
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {result.items.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No audit log entries match this filter.</p>
        )}
        {result.items.map((entry) => (
          <details key={entry.id} className="group px-5 py-3">
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 text-sm [&::-webkit-details-marker]:hidden">
              <span className="font-mono text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
              <Badge variant="secondary" className="font-normal">
                {entry.action}
              </Badge>
              <span className="text-muted-foreground">
                {entry.entityType} · {entry.entityId}
              </span>
              <span className="ml-auto text-muted-foreground">{entry.actorName ?? "System"}</span>
            </summary>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Before</p>
                <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs">
                  {entry.before ? JSON.stringify(entry.before, null, 2) : "null"}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">After</p>
                <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs">
                  {entry.after ? JSON.stringify(entry.after, null, 2) : "null"}
                </pre>
              </div>
            </div>
            {entry.ip && <p className="mt-2 text-xs text-muted-foreground">IP: {entry.ip}</p>}
          </details>
        ))}
      </div>

      <AdminPagination page={result.page} totalPages={result.totalPages} basePath="/admin/audit-log" searchParams={{ entityType }} />
    </div>
  );
}
