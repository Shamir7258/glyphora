"use client";

import { useMemo } from "react";
import { buildFontFaceCss } from "@/lib/fonts";

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz".split("");
const NUMBERS = "0123456789".split("");
const SPECIALS = "!?@#$%&*()[]{}.,;:'\"-+=/".split("");

export function GlyphGrid({ fontId, previewFontUrl }: { fontId: string; previewFontUrl: string | null }) {
  const { fontFamily, css } = useMemo(() => buildFontFaceCss(fontId, previewFontUrl), [fontId, previewFontUrl]);

  return (
    <div className="flex flex-col gap-8">
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <GlyphRow title="Uppercase" glyphs={UPPERCASE} fontFamily={previewFontUrl ? fontFamily : undefined} />
      <GlyphRow title="Lowercase" glyphs={LOWERCASE} fontFamily={previewFontUrl ? fontFamily : undefined} />
      <GlyphRow title="Numbers" glyphs={NUMBERS} fontFamily={previewFontUrl ? fontFamily : undefined} />
      <GlyphRow title="Characters" glyphs={SPECIALS} fontFamily={previewFontUrl ? fontFamily : undefined} />
    </div>
  );
}

function GlyphRow({ title, glyphs, fontFamily }: { title: string; glyphs: string[]; fontFamily?: string }) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-muted-foreground">{title}</p>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-9 md:grid-cols-12">
        {glyphs.map((glyph, i) => (
          <div
            key={`${glyph}-${i}`}
            className="flex aspect-square items-center justify-center rounded-lg border border-border bg-card text-2xl transition-colors hover:border-primary/40 hover:bg-accent"
            style={{ fontFamily }}
          >
            {glyph}
          </div>
        ))}
      </div>
    </div>
  );
}
