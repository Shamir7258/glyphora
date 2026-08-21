import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileCheck2, FileWarning } from "lucide-react";
import { AdminFontRepository } from "@/server/repositories/admin-font.repository";
import { AdminLicenseRepository } from "@/server/repositories/admin-catalog.repository";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { FontGlyphPreview } from "@/components/admin/font-glyph-preview";
import { FontModerationActions } from "@/components/admin/font-moderation-actions";
import { formatMoney, formatBytes, formatDateTime } from "@/components/admin/format";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({ params }: PageProps<"/admin/fonts/[id]">) {
  const { id } = await params;
  const font = await AdminFontRepository.getReviewDetail(id);
  return { title: font ? `Review: ${font.name} — Glyphora Admin` : "Review font — Glyphora Admin" };
}

export default async function AdminFontReviewPage({ params }: PageProps<"/admin/fonts/[id]">) {
  const { id } = await params;
  const [font, licenses] = await Promise.all([AdminFontRepository.getReviewDetail(id), AdminLicenseRepository.list()]);
  if (!font) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/fonts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to moderation queue
      </Link>

      <AdminPageHeader
        title={font.name}
        description={`Submitted by ${font.designer.displayName} (@${font.designer.username})${font.designer.isPlatform ? " — platform account" : ""}`}
        actions={<StatusBadge status={font.status} className="text-sm" />}
      />

      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <FontModerationActions fontId={font.id} status={font.status} isPlatform={font.designer.isPlatform} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-display text-base font-semibold">Live preview</h2>
            <FontGlyphPreview fontId={font.id} previewFontUrl={font.previewFontUrl} previewText={font.previewText} />
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-display text-base font-semibold">Description</h2>
            <p className="text-sm whitespace-pre-wrap text-foreground/90">{font.description}</p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-display text-base font-semibold">Uploaded files</h2>
            {font.files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {font.files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {f.validated ? (
                        <FileCheck2 className="size-4 shrink-0 text-primary" />
                      ) : (
                        <FileWarning className="size-4 shrink-0 text-destructive" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{f.originalFilename}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.purpose} · {f.format} · {formatBytes(f.fileSizeBytes)}
                          {!f.validated && f.validationNotes ? ` · ${f.validationNotes}` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant={f.validated ? "secondary" : "destructive"} className="shrink-0 font-normal">
                      {f.validated ? "Validated" : "Not validated"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Deliverable files are never downloadable from here — only the PREVIEW file is rendered above (see
              docs/ARCHITECTURE.md §6).
            </p>
          </section>

          {font.status === "REJECTED" && font.rejectionReason && (
            <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <h2 className="mb-1 font-display text-base font-semibold text-destructive">Rejection reason</h2>
              <p className="text-sm text-foreground/90">{font.rejectionReason}</p>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-display text-base font-semibold">Metadata</h2>
            <dl className="space-y-2.5 text-sm">
              <Row label="Category" value={font.category.name} />
              <Row
                label="Tags"
                value={
                  font.tags.length > 0 ? (
                    <div className="flex flex-wrap justify-end gap-1">
                      {font.tags.map((t) => (
                        <Badge key={t.id} variant="secondary" className="font-normal">
                          {t.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )
                }
              />
              <Row label="Languages" value={font.languages.join(", ") || "—"} />
              <Row label="Glyph count" value={font.glyphCount.toLocaleString()} />
              <Row label="Base price" value={formatMoney(font.basePriceCents, font.currency)} />
              <Row label="Submitted" value={formatDateTime(font.createdAt)} />
              {font.reviewedAt && <Row label="Last reviewed" value={formatDateTime(font.reviewedAt)} />}
              {font.reviewedByName && <Row label="Reviewed by" value={font.reviewedByName} />}
              {font.publishedAt && <Row label="Published" value={formatDateTime(font.publishedAt)} />}
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-1 font-display text-base font-semibold">License pricing</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Computed from active license templates × base price — licenses are admin-configured
              globally, not per-font (see docs/agent-reports/admin-panel.md).
            </p>
            <ul className="space-y-2">
              {licenses.map((l) => (
                <li key={String(l._id)} className="flex items-center justify-between text-sm">
                  <span>{l.name}</span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(Math.round(font.basePriceCents * l.priceMultiplier), font.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-display text-base font-semibold">Designer</h2>
            <p className="text-sm font-medium">{font.designer.displayName}</p>
            <p className="text-sm text-muted-foreground">@{font.designer.username}</p>
            {font.designer.bio && <p className="mt-2 text-sm text-foreground/80">{font.designer.bio}</p>}
            <Link
              href={`/admin/designers?q=${encodeURIComponent(font.designer.username)}`}
              className="mt-3 inline-block text-sm text-primary hover:underline"
            >
              View in designers list →
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
