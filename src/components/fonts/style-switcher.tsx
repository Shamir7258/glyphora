"use client";

import { useMemo, useState } from "react";
import { buildFontFaceCss } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import type { FontVariantDTO } from "@/types/dto";

export function StyleSwitcher({ variants, previewText }: { variants: FontVariantDTO[]; previewText: string }) {
  const [activeId, setActiveId] = useState(variants.find((v) => v.isDefault)?.id ?? variants[0]?.id);
  const active = variants.find((v) => v.id === activeId) ?? variants[0];
  const { fontFamily, css } = useMemo(
    () => buildFontFaceCss(`variant-${active.id}`, active.previewFontUrl),
    [active.id, active.previewFontUrl]
  );

  return (
    <div className="flex flex-col gap-4">
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setActiveId(v.id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              v.id === activeId
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent"
            )}
          >
            {v.name}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card px-6 py-8">
        <p
          className="text-3xl break-words sm:text-4xl"
          style={{ fontFamily: active.previewFontUrl ? fontFamily : undefined, fontStyle: active.style }}
        >
          {previewText}
        </p>
      </div>
    </div>
  );
}
