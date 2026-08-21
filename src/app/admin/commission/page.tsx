import { CommissionService } from "@/server/services/commission.service";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CommissionForm } from "@/components/admin/commission-form";
import { formatDateTime } from "@/components/admin/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Commission — Glyphora Admin" };

export default async function AdminCommissionPage() {
  const [currentPercentage, history] = await Promise.all([
    CommissionService.getEffectivePercentage(),
    CommissionService.history(50),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader
        title="Commission"
        description="The platform's cut of every marketplace sale, versioned so historical earnings are never recomputed."
      />

      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Currently effective rate</p>
        <p className="font-display text-4xl font-semibold tracking-tight">{currentPercentage}%</p>
      </div>

      <div className="mb-8 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 font-display text-base font-semibold">Set a new rate</h2>
        <CommissionForm currentPercentage={currentPercentage} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="font-display text-base font-semibold">History</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Percentage</TableHead>
              <TableHead>Effective from</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((h) => (
              <TableRow key={String(h._id)}>
                <TableCell className="font-medium">{h.percentage}%</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(h.effectiveFrom.toISOString())}</TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">{h.note || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
