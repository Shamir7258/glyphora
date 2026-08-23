"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiFetch, ClientApiError } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { CHECK_LABELS, type FontDraftState } from "./types";

function formatCents(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function ReviewPanel({ draft, onSubmitted }: { draft: FontDraftState; onSubmitted?: () => void | Promise<void> }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await apiFetch(`/api/seller/fonts/${draft.id}/submit`, { method: "POST" });
      toast.success("Submitted for review — you'll be notified once an admin reviews it.");
      if (onSubmitted) await onSubmitted();
      router.push("/seller/fonts");
      router.refresh();
    } catch (err) {
      if (err instanceof ClientApiError) toast.error(err.message);
      else toast.error("Couldn't submit — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = draft.status === "DRAFT" || draft.status === "REJECTED";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 font-medium">Summary</h3>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row label="Name" value={draft.name} />
          <Row label="Category" value={draft.categoryName ?? "—"} />
          <Row label="Languages" value={draft.languages.join(", ") || "—"} />
          <Row label="Glyph count" value={String(draft.glyphCount)} />
          <Row label="Preview text" value={draft.previewText} />
          <Row label="Price" value={formatCents(draft.basePriceCents, draft.currency)} />
          <Row label="Licenses selected" value={String(draft.licenseIds.length)} />
          <Row label="Files uploaded" value={String(draft.files.length)} />
        </dl>
        {draft.description && <p className="mt-4 text-sm text-muted-foreground">{draft.description}</p>}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 font-medium">Ready to submit?</h3>
        <ul className="space-y-2">
          {(Object.keys(CHECK_LABELS) as (keyof typeof CHECK_LABELS)[]).map((key) => {
            const ok = draft.checklist.checks[key];
            return (
              <li key={key} className="flex items-center gap-2 text-sm">
                {ok ? (
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className={cn(!ok && "text-muted-foreground")}>{CHECK_LABELS[key]}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {draft.status === "REJECTED" && draft.rejectionReason && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <h3 className="mb-1 font-medium text-destructive">Previously rejected</h3>
          <p className="text-sm text-destructive/90">{draft.rejectionReason}</p>
        </div>
      )}

      {canSubmit ? (
        <Button onClick={handleSubmit} disabled={!draft.checklist.ready || submitting} size="lg">
          {submitting ? "Submitting…" : "Submit for review"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          This font is {draft.status.replace("_", " ").toLowerCase()} and can&apos;t be resubmitted right now.
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
