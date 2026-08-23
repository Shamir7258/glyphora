import type { Metadata } from "next";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { DesignerCard } from "@/components/designers/designer-card";
import { DesignerRepository } from "@/server/repositories/designer.repository";

export const metadata: Metadata = { title: "Designers" };
export const revalidate = 60;

const LIMIT = 24;

export default async function DesignersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const { items, total } = await DesignerRepository.listActive({ page, limit: LIMIT, q });
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-display text-4xl tracking-tight">Designers</h1>
        <p className="mt-2 text-muted-foreground">
          Independent type designers from around the world, publishing directly on Glyphora.
        </p>
      </div>

      <form className="mb-8 flex max-w-md items-center gap-2" action="/designers">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search designers…" className="pl-8" />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? `No designers match "${q}"` : "No designers yet"}
          description={q ? "Try a different search term." : "Designers will appear here as they join Glyphora."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((d) => (
            <DesignerCard key={d.id} designer={d} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-3">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/designers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`}>
                Previous
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/designers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`}>
                Next
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
