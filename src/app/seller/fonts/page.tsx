import type { Metadata } from "next";
// Ensures every model is registered before .populate() resolves refs by name
// (Category here) — see src/server/models/index.ts.
import "@/server/models";
import Link from "next/link";
import { Plus, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { FontStatusBadge } from "@/components/seller/font-status-badge";
import { requireDesignerProfileId } from "@/server/lib/session";
import { connectDB } from "@/server/lib/db";
import { FontModel } from "@/server/models/font.model";
import { FontFileModel } from "@/server/models/font-file.model";

export const metadata: Metadata = { title: "Your fonts" };

function formatPrice(cents: number, currency: string) {
  if (!cents) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export default async function SellerFontsPage() {
  const { designerProfileId } = await requireDesignerProfileId();
  await connectDB();

  const fonts = await FontModel.find({ designer: designerProfileId })
    .sort({ updatedAt: -1 })
    .populate("category", "name")
    .lean();

  const fileCounts = fonts.length
    ? await FontFileModel.aggregate<{ _id: { font: unknown; purpose: string }; count: number }>([
        { $match: { font: { $in: fonts.map((f) => f._id) } } },
        { $group: { _id: { font: "$font", purpose: "$purpose" }, count: { $sum: 1 } } },
      ])
    : [];
  const deliverableCounts = new Map<string, number>();
  for (const row of fileCounts) {
    if (row._id.purpose === "DELIVERABLE") deliverableCounts.set(String(row._id.font), row.count);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Your fonts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Everything you&apos;ve uploaded, at every stage of review.</p>
        </div>
        <Button asChild>
          <Link href="/seller/fonts/new">
            <Plus className="size-4" /> Upload a font
          </Link>
        </Button>
      </div>

      {fonts.length === 0 ? (
        <EmptyState
          icon={Type}
          title="No fonts yet"
          description="Upload your first typeface to start selling on Glyphora."
          action={
            <Button asChild>
              <Link href="/seller/fonts/new">Upload a font</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Font</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Sales</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fonts.map((font) => {
                const category = font.category as unknown as { name: string } | null;
                const canEdit = font.status === "DRAFT" || font.status === "REJECTED";
                return (
                  <tr key={font._id.toString()}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{font.name}</p>
                      {font.status === "REJECTED" && font.rejectionReason && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-destructive">{font.rejectionReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <FontStatusBadge status={font.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{category?.name ?? "—"}</td>
                    <td className="px-4 py-3">{formatPrice(font.basePriceCents, font.currency)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{font.salesCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {(font.status === "PUBLISHED" || font.status === "APPROVED") && (
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/fonts/${font.slug}`}>View</Link>
                          </Button>
                        )}
                        {canEdit && (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/seller/fonts/${font._id.toString()}/edit`}>
                              {font.status === "REJECTED" ? "Fix & resubmit" : "Continue editing"}
                            </Link>
                          </Button>
                        )}
                        {!canEdit && font.status !== "PUBLISHED" && font.status !== "APPROVED" && (
                          <span className="text-xs text-muted-foreground">
                            {deliverableCounts.get(font._id.toString()) ?? 0} file(s)
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
