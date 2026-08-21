import { AdminLicenseRepository } from "@/server/repositories/admin-catalog.repository";
import { AdminPageHeader } from "@/components/admin/page-header";
import { LicenseFormDialog } from "@/components/admin/license-form-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Licenses — Glyphora Admin" };

export default async function AdminLicensesPage() {
  const licenses = await AdminLicenseRepository.list();

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader
        title="Licenses"
        description="License templates every font is priced against — never hardcoded on the storefront."
        actions={<LicenseFormDialog />}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Multiplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {licenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No licenses yet.
                </TableCell>
              </TableRow>
            )}
            {licenses.map((l) => (
              <TableRow key={String(l._id)}>
                <TableCell className="font-mono text-xs font-medium">{l.key}</TableCell>
                <TableCell>{l.name}</TableCell>
                <TableCell>{l.priceMultiplier}×</TableCell>
                <TableCell>
                  <Badge variant={l.isActive ? "secondary" : "outline"} className="font-normal">
                    {l.isActive ? "Active" : "Hidden"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <LicenseFormDialog
                    target={{
                      id: String(l._id),
                      key: l.key,
                      name: l.name,
                      description: l.description,
                      priceMultiplier: l.priceMultiplier,
                      allowedUsage: l.allowedUsage,
                      restrictions: l.restrictions,
                      isActive: l.isActive,
                      sortOrder: l.sortOrder,
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
