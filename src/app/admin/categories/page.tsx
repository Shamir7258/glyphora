import { AdminCategoryRepository } from "@/server/repositories/admin-catalog.repository";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CategoryFormDialog } from "@/components/admin/category-form-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Categories — Glyphora Admin" };

export default async function AdminCategoriesPage() {
  const categories = await AdminCategoryRepository.list();

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader
        title="Categories"
        description="Storefront categories — never hardcoded in the frontend, read live from this collection."
        actions={<CategoryFormDialog />}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No categories yet.
                </TableCell>
              </TableRow>
            )}
            {categories.map((c) => (
              <TableRow key={String(c._id)}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{c.slug}</TableCell>
                <TableCell>{c.sortOrder}</TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? "secondary" : "outline"} className="font-normal">
                    {c.isActive ? "Active" : "Hidden"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <CategoryFormDialog
                    target={{
                      id: String(c._id),
                      name: c.name,
                      description: c.description,
                      icon: c.icon ?? undefined,
                      sortOrder: c.sortOrder,
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
