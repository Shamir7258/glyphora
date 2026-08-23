"use client";

import { useMemo } from "react";
import Image from "next/image";
import { buildFontFaceCss } from "@/lib/fonts";

/**
 * Simple CSS compositions standing in for real mockups — deliberately not
 * production photography/design assets (out of V1 scope), just enough to show
 * the font used "in context" the way a logo/poster/social post would. See
 * docs/DEVELOPMENT.md — images.unsplash.com is whitelisted for optional texture.
 */
export function RealWorldExamples({
  fontId,
  previewFontUrl,
  fontName,
}: {
  fontId: string;
  previewFontUrl: string | null;
  fontName: string;
}) {
  const { fontFamily, css } = useMemo(() => buildFontFaceCss(fontId, previewFontUrl), [fontId, previewFontUrl]);
  const style: React.CSSProperties = { fontFamily: previewFontUrl ? fontFamily : undefined };

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}

      {/* Logo card */}
      <div className="flex aspect-4/3 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-secondary px-6 text-center">
        <p className="text-4xl" style={style}>
          {fontName}
        </p>
        <span className="text-[10px] font-medium tracking-[0.3em] text-muted-foreground uppercase">Brand mark</span>
      </div>

      {/* Poster card */}
      <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-border">
        <Image
          src="https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=800&q=75&auto=format&fit=crop"
          alt=""
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          quality={75}
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <p className="absolute inset-x-4 bottom-5 text-3xl leading-none text-white" style={style}>
          {fontName}
        </p>
      </div>

      {/* Social post card */}
      <div className="flex aspect-4/3 flex-col justify-between rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-full bg-primary/80" />
          <div className="h-2 w-20 rounded-full bg-muted" />
        </div>
        <p className="text-2xl leading-tight" style={style}>
          {fontName}
        </p>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>♡ 128</span>
          <span>↻ 24</span>
          <span>↗ Share</span>
        </div>
      </div>
    </div>
  );
}
