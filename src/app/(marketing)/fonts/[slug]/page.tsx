import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Heart, Languages, Layers, ShapesIcon, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FontPreviewHero } from "@/components/fonts/font-preview-hero";
import { GlyphGrid } from "@/components/fonts/glyph-grid";
import { StyleSwitcher } from "@/components/fonts/style-switcher";
import { OpenTypeFeaturesSection } from "@/components/fonts/opentype-features";
import { RealWorldExamples } from "@/components/fonts/real-world-examples";
import { LicensePicker } from "@/components/fonts/license-picker";
import { ReviewsSection } from "@/components/fonts/reviews-section";
import { FavoriteButton } from "@/components/fonts/favorite-button";
import { FontRepository } from "@/server/repositories/font.repository";
import { LicenseRepository } from "@/server/repositories/license.repository";
import { ReviewRepository } from "@/server/repositories/review.repository";
import { FavoriteRepository } from "@/server/repositories/favorite.repository";
import { OrderRepository } from "@/server/repositories/order.repository";
import { getSession } from "@/server/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const font = await FontRepository.findPublishedBySlug(slug);
  if (!font) return { title: "Font" };
  const detail = await FontRepository.toDetailDTO(font);
  return {
    title: detail.seo.title,
    description: detail.seo.description,
    openGraph: detail.seo.ogImage ? { images: [{ url: detail.seo.ogImage }] } : undefined,
  };
}

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export default async function FontDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const font = await FontRepository.findPublishedBySlug(slug);
  if (!font) notFound();

  const detail = await FontRepository.toDetailDTO(font);

  // Fire-and-forget analytics counter — never block render on it.
  void FontRepository.incrementViewCount(font._id.toString());

  const [licenses, reviews, summary, session] = await Promise.all([
    LicenseRepository.listActive(),
    ReviewRepository.listForFont(detail.id),
    ReviewRepository.summaryForFont(detail.id),
    getSession(),
  ]);

  let favoriteId: string | null = null;
  let canReview = false;
  if (session?.user) {
    const favMap = await FavoriteRepository.mapForFonts(session.user.id, [detail.id]);
    favoriteId = favMap.get(detail.id) ?? null;
    const alreadyReviewed = reviews.some((r) => r.user.id === session.user.id);
    if (!alreadyReviewed) {
      const paidOrderId = await OrderRepository.findPaidOrderIdForUserAndFont(session.user.id, detail.id);
      canReview = !!paidOrderId;
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{detail.category.name}</Badge>
              {detail.productType === "ORIGINAL" && <Badge>Original</Badge>}
              {detail.tags.slice(0, 4).map((t) => (
                <Link key={t.id} href={`/fonts?tag=${t.slug}`}>
                  <Badge variant="outline" className="hover:bg-accent">
                    {t.name}
                  </Badge>
                </Link>
              ))}
            </div>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">{detail.name}</h1>
            <p className="mt-2 text-muted-foreground">
              by{" "}
              <Link href={`/designers/${detail.designer.username}`} className="font-medium hover:underline">
                {detail.designer.displayName}
              </Link>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <FavoriteButton fontId={detail.id} favoriteId={favoriteId} />
            <Button asChild>
              <a href="#buy">
                <ShoppingBag className="size-4" /> Buy font
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="mt-8">
        <FontPreviewHero fontId={detail.id} previewFontUrl={detail.previewFontUrl} defaultPreviewText={detail.previewText} />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-3">
          <div className="flex flex-col gap-14 lg:col-span-2">
            {/* Description + info */}
            <section>
              <h2 className="font-display text-2xl font-medium tracking-tight">About this font</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{detail.description}</p>

              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <InfoStat icon={ShapesIcon} label="Glyphs" value={String(detail.glyphCount || "—")} />
                <InfoStat icon={Layers} label="Formats" value={detail.formats.join(", ") || "—"} />
                <InfoStat icon={Languages} label="Languages" value={detail.languages.join(", ") || "—"} />
                <InfoStat icon={Heart} label="Favorited" value={String(detail.favoriteCount)} />
              </dl>
            </section>

            {detail.variants.length > 1 && (
              <section>
                <h2 className="font-display text-2xl font-medium tracking-tight">Styles</h2>
                <div className="mt-5">
                  <StyleSwitcher variants={detail.variants} previewText={detail.previewText} />
                </div>
              </section>
            )}

            <section>
              <h2 className="font-display text-2xl font-medium tracking-tight">Character set</h2>
              <div className="mt-5">
                <GlyphGrid fontId={detail.id} previewFontUrl={detail.previewFontUrl} />
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-medium tracking-tight">OpenType features</h2>
              <div className="mt-5">
                <OpenTypeFeaturesSection fontId={detail.id} previewFontUrl={detail.previewFontUrl} features={detail.openTypeFeatures} />
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-medium tracking-tight">In the wild</h2>
              <p className="mt-1 text-sm text-muted-foreground">A few illustrative placements — not real client work.</p>
              <div className="mt-5">
                <RealWorldExamples fontId={detail.id} previewFontUrl={detail.previewFontUrl} fontName={detail.name} />
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="font-display text-2xl font-medium tracking-tight">Reviews</h2>
              <div className="mt-5">
                <ReviewsSection fontId={detail.id} reviews={reviews} summary={summary} canReview={canReview} />
              </div>
            </section>
          </div>

          {/* Licensing sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 flex flex-col gap-4">
              <div className="rounded-2xl border border-border bg-card p-6">
                <p className="text-xs text-muted-foreground">Starting at</p>
                <p className="font-display text-3xl font-medium">{formatPrice(detail.basePriceCents, detail.currency)}</p>
                <p className="mt-1 text-sm text-muted-foreground">Personal license. Commercial pricing below.</p>
              </div>
              <LicensePicker
                fontId={detail.id}
                basePriceCents={detail.basePriceCents}
                currency={detail.currency}
                licenses={licenses}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <p className="truncate font-medium" title={value}>
        {value}
      </p>
    </div>
  );
}
