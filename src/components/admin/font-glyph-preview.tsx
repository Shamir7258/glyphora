"use client";

import { buildFontFaceCss } from "@/lib/fonts";

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";

/**
 * Live preview for the admin review page, built the same way FontCard does it
 * (see src/components/fonts/font-card.tsx): a scoped @font-face pointed at the
 * font's PREVIEW FontFile URL (public/safe — never the DELIVERABLE file, see
 * docs/ARCHITECTURE.md §6).
 */
export function FontGlyphPreview({
  fontId,
  previewFontUrl,
  previewText,
}: {
  fontId: string;
  previewFontUrl: string | null;
  previewText: string;
}) {
  const { fontFamily, css } = buildFontFaceCss(fontId, previewFontUrl);

  if (!previewFontUrl) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No preview file uploaded yet — nothing to render.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <div className="rounded-lg border border-border bg-muted/40 px-5 py-6">
        <p className="text-3xl leading-snug break-words" style={{ fontFamily }}>
          {previewText}
        </p>
      </div>
      <div className="grid gap-2 rounded-lg border border-border px-5 py-4">
        <p className="text-xl tracking-wide break-all" style={{ fontFamily }}>
          {UPPER}
        </p>
        <p className="text-xl tracking-wide break-all" style={{ fontFamily }}>
          {LOWER}
        </p>
        <p className="text-xl tracking-wide break-all" style={{ fontFamily }}>
          {DIGITS}
        </p>
      </div>
    </div>
  );
}
