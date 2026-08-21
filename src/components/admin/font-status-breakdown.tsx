import type { StatusBreakdownPoint } from "@/server/repositories/admin-dashboard.repository";
import { FONT_STATUS } from "@/types/enums";

// A small fixed set of categories where the "magnitude" is what matters, not
// identity between bars — a single-hue horizontal bar list reads faster here than
// a pie/donut (dataviz skill: prefer a bar form for magnitude comparisons) and
// needs no categorical palette or legend.
export function FontStatusBreakdown({ data }: { data: StatusBreakdownPoint[] }) {
  const byStatus = new Map(data.map((d) => [d.status, d.count]));
  const rows = FONT_STATUS.map((status) => ({ status, count: byStatus.get(status) ?? 0 }));
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.status} className="flex items-center gap-3">
          <span className="w-32 shrink-0 text-xs font-medium text-muted-foreground capitalize">
            {row.status.replaceAll("_", " ").toLowerCase()}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums">{row.count}</span>
        </div>
      ))}
    </div>
  );
}
