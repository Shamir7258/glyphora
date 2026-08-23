"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import { FilesPanel } from "./files-panel";
import { DetailsForm } from "./details-form";
import { PreviewForm } from "./preview-form";
import { PricingForm } from "./pricing-form";
import { LicenseForm } from "./license-form";
import { ReviewPanel } from "./review-panel";
import { useFontDraft } from "./use-font-draft";
import type { CategoryDTO, LicenseDTO, TagDTO } from "@/types/dto";

/**
 * /seller/fonts/[id]/edit — all wizard sections stacked on one page (rather
 * than stepped) so a DRAFT or REJECTED font can be resumed/fixed in place, per
 * the task brief. Reuses the exact same field components as the /new wizard so
 * the two flows never drift.
 */
export function FontEditor({
  fontId,
  categories,
  tags,
  licenses,
}: {
  fontId: string;
  categories: CategoryDTO[];
  tags: TagDTO[];
  licenses: LicenseDTO[];
}) {
  const { draft, loading, refresh } = useFontDraft(fontId);

  if (loading || !draft) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const editable = draft.status === "DRAFT" || draft.status === "REJECTED";

  return (
    <div className="space-y-8">
      {draft.status === "REJECTED" && draft.rejectionReason && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <h2 className="font-medium text-destructive">This font was rejected</h2>
            <p className="mt-1 text-sm text-destructive/90">{draft.rejectionReason}</p>
            <p className="mt-1 text-sm text-muted-foreground">Fix the issue below and resubmit for review.</p>
          </div>
        </div>
      )}

      {!editable && (
        <div className="rounded-xl border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
          This font is {draft.status.replace("_", " ").toLowerCase()} and can no longer be edited here.
        </div>
      )}

      <Section title="Files">
        <FilesPanel fontId={fontId} files={draft.files} onUploaded={refresh} />
      </Section>

      {editable && (
        <>
          <Section title="Details">
            <DetailsForm
              fontId={fontId}
              categories={categories}
              tags={tags}
              initial={{
                name: draft.name === "Untitled font" ? "" : draft.name,
                description: draft.description,
                categoryId: draft.categoryId ?? "",
                tagIds: draft.tagIds,
                languages: draft.languages,
                glyphCount: draft.glyphCount || 1,
              }}
              onSaved={refresh}
              submitLabel="Save details"
            />
          </Section>

          <Section title="Preview">
            <PreviewForm
              fontId={fontId}
              files={draft.files}
              initial={{ previewText: draft.previewText }}
              onSaved={refresh}
              submitLabel="Save preview text"
            />
          </Section>

          <Section title="Pricing">
            <PricingForm
              fontId={fontId}
              initial={{ basePriceCents: draft.basePriceCents, currency: draft.currency }}
              onSaved={refresh}
              submitLabel="Save price"
            />
          </Section>

          <Section title="License">
            <LicenseForm
              fontId={fontId}
              licenses={licenses}
              initial={{ licenseIds: draft.licenseIds }}
              onSaved={refresh}
              submitLabel="Save licenses"
            />
          </Section>

          <Section title="Review & submit">
            <ReviewPanel draft={draft} onSubmitted={refresh} />
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-5 font-display text-xl tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
