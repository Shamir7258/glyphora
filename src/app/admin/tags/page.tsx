import { AdminTagRepository } from "@/server/repositories/admin-catalog.repository";
import { AdminPageHeader } from "@/components/admin/page-header";
import { TagFormDialog } from "@/components/admin/tag-form-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Tags — Glyphora Admin" };

export default async function AdminTagsPage() {
  const tags = await AdminTagRepository.list();

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader
        title="Tags"
        description="Style and mood tags used for filtering and fuzzy search matching."
        actions={<TagFormDialog />}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No tags yet.
                </TableCell>
              </TableRow>
            )}
            {tags.map((t) => (
              <TableRow key={String(t._id)}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{t.slug}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {t.kind}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <TagFormDialog target={{ id: String(t._id), name: t.name, kind: t.kind }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
