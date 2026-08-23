"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { buildFontFaceCss } from "@/lib/fonts";
import { EmptyState } from "@/components/shared/empty-state";
import type { OpenTypeFeatureDTO } from "@/types/dto";

export function OpenTypeFeaturesSection({
  fontId,
  previewFontUrl,
  features,
}: {
  fontId: string;
  previewFontUrl: string | null;
  features: OpenTypeFeatureDTO[];
}) {
  const { fontFamily, css } = useMemo(() => buildFontFaceCss(fontId, previewFontUrl), [fontId, previewFontUrl]);

  if (features.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No OpenType features listed"
        description="This font's designer hasn't documented any special OpenType features (ligatures, alternates, small caps, …) yet."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      {features.map((f) => (
        <div key={f.key} className="rounded-xl border border-border bg-card p-5">
          <p className="font-medium">{f.name}</p>
          {f.description && <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>}
          {f.sampleText && (
            <p
              className="mt-3 text-2xl"
              style={{ fontFamily: previewFontUrl ? fontFamily : undefined, fontFeatureSettings: `"${f.key}" 1` }}
            >
              {f.sampleText}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
