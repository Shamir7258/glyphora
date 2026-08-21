"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { buildFontFaceCss } from "@/lib/fonts";
import { useFavorite } from "@/hooks/use-favorite";
import { cn } from "@/lib/utils";
import type { FontSummaryDTO } from "@/types/dto";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function FontCard({ font, favoriteId = null }: { font: FontSummaryDTO; favoriteId?: string | null }) {
  const [previewText, setPreviewText] = useState(font.previewText);
  const [isFavorited, setIsFavorited] = useState(!!favoriteId);
  const favorite = useFavorite(font.id, favoriteId);
  const { fontFamily, css } = buildFontFaceCss(font.id, font.previewFontUrl);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}

      <Link href={`/fonts/${font.slug}`} className="block border-b border-border/80 px-5 pt-6 pb-5">
        <p
          className="min-h-16 truncate text-3xl leading-tight break-words"
          style={{ fontFamily: font.previewFontUrl ? fontFamily : undefined }}
        >
          {previewText || font.previewText}
        </p>
      </Link>

      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2">
        <Input
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          onClick={(e) => e.preventDefault()}
          placeholder="Type something…"
          aria-label={`Custom preview text for ${font.name}`}
          className="h-8 border-0 px-1 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/fonts/${font.slug}`} className="truncate font-medium hover:underline">
              {font.name}
            </Link>
            <Link
              href={`/designers/${font.designer.username}`}
              className="block truncate text-sm text-muted-foreground hover:text-foreground"
            >
              {font.designer.displayName}
            </Link>
          </div>
          <button
            type="button"
            aria-pressed={isFavorited}
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            onClick={() => {
              setIsFavorited((v) => !v);
              favorite.toggle(favoriteId);
            }}
            className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Heart className={cn("size-4.5 transition-transform", isFavorited && "scale-110 fill-primary text-primary")} />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="font-normal">
            {font.category.name}
          </Badge>
          {font.productType === "ORIGINAL" && <Badge className="font-normal">Original</Badge>}
        </div>

        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="font-medium">{formatPrice(font.basePriceCents, font.currency)}</span>
          <Button asChild size="sm" variant="outline">
            <Link href={`/fonts/${font.slug}#buy`}>
              <ShoppingBag className="size-3.5" /> Buy
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
