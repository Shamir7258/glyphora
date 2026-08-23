"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/fetcher";
import { StepIndicator, WIZARD_STEPS } from "./step-indicator";
import { FilesPanel } from "./files-panel";
import { DetailsForm } from "./details-form";
import { PreviewForm } from "./preview-form";
import { PricingForm } from "./pricing-form";
import { LicenseForm } from "./license-form";
import { ReviewPanel } from "./review-panel";
import { useFontDraft } from "./use-font-draft";
import type { CategoryDTO, LicenseDTO, TagDTO } from "@/types/dto";

/**
 * /seller/fonts/new — the multi-step upload wizard. A DRAFT Font is created
 * immediately on mount (with placeholder name/description) so the Files step
 * has a fontId to attach FontFiles to before any other step has real data —
 * every later step PATCHes that same draft with its own fields. See
 * docs/agent-reports/designer-experience.md for why the draft is created this
 * early rather than after the Details step.
 */
export function FontWizard({
  categories,
  tags,
  licenses,
}: {
  categories: CategoryDTO[];
  tags: TagDTO[];
  licenses: LicenseDTO[];
}) {
  const [fontId, setFontId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const creatingRef = useRef(false);
  const { draft, loading, refresh } = useFontDraft(fontId);

  useEffect(() => {
    if (fontId || creatingRef.current) return;
    creatingRef.current = true;
    apiFetch<{ fontId: string }>("/api/seller/fonts", { method: "POST", body: JSON.stringify({}) })
      .then((res) => setFontId(res.fontId))
      .catch(() => {
        creatingRef.current = false;
      });
  }, [fontId]);

  if (!fontId || loading || !draft) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Setting up your draft…</p>
      </div>
    );
  }

  const filesReady = draft.checklist.checks.hasDeliverableFile && draft.checklist.checks.hasPreviewFile;

  return (
    <div className="space-y-8">
      <StepIndicator current={step} />

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-5 font-display text-xl tracking-tight">{WIZARD_STEPS[step]}</h2>

        {step === 0 && (
          <div className="space-y-6">
            <FilesPanel fontId={fontId} files={draft.files} onUploaded={refresh} />
            <div className="flex items-center gap-3 border-t border-border pt-5">
              <Button onClick={() => setStep(1)} disabled={!filesReady}>
                Continue
              </Button>
              {!filesReady && (
                <p className="text-sm text-muted-foreground">Upload at least one deliverable and one preview file.</p>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
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
            onSaved={async () => {
              await refresh();
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <PreviewForm
            fontId={fontId}
            files={draft.files}
            initial={{ previewText: draft.previewText }}
            onSaved={async () => {
              await refresh();
              setStep(3);
            }}
          />
        )}

        {step === 3 && (
          <PricingForm
            fontId={fontId}
            initial={{ basePriceCents: draft.basePriceCents, currency: draft.currency }}
            onSaved={async () => {
              await refresh();
              setStep(4);
            }}
          />
        )}

        {step === 4 && (
          <LicenseForm
            fontId={fontId}
            licenses={licenses}
            initial={{ licenseIds: draft.licenseIds }}
            submitLabel="Continue to review"
            onSaved={async () => {
              await refresh();
              setStep(5);
            }}
          />
        )}

        {step === 5 && <ReviewPanel draft={draft} />}

        {step > 0 && (
          <div className="mt-5 border-t border-border pt-5">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))}>
              Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
