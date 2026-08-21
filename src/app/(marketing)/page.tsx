import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { FontSection } from "@/components/marketing/font-section";
import { CategoryGrid, StyleTagCloud } from "@/components/marketing/category-grid";
import { DesignerRail } from "@/components/marketing/designer-rail";
import { BundleRail } from "@/components/marketing/bundle-rail";
import { DesignerCta } from "@/components/marketing/designer-cta";
import { FontRepository } from "@/server/repositories/font.repository";
import { CategoryRepository } from "@/server/repositories/category.repository";
import { DesignerRepository } from "@/server/repositories/designer.repository";
import { CollectionRepository } from "@/server/repositories/collection.repository";
import { connectDB } from "@/server/lib/db";
import { TagModel } from "@/server/models/tag.model";

export const metadata: Metadata = {
  title: "Premium Fonts, Instantly Previewed",
};

// Public, slow-changing page — ISR rather than the experimental "use cache"
// directive (see docs/ARCHITECTURE.md §3). Busted by revalidatePath() whenever a
// font is published/approved.
export const revalidate = 60;

export default async function HomePage() {
  const [originals, trending, newReleases, marketplacePopular, categories, styleTags, designers, bundles] =
    await Promise.all([
      FontRepository.listPublished({ productType: "ORIGINAL", sort: "popular", limit: 8 }),
      FontRepository.listPublished({ sort: "popular", limit: 8 }),
      FontRepository.listPublished({ sort: "newest", limit: 8 }),
      FontRepository.listPublished({ productType: "MARKETPLACE", sort: "popular", limit: 8 }),
      CategoryRepository.listActive(),
      listStyleTags(),
      DesignerRepository.listFeatured(6),
      CollectionRepository.listPublicBundles(4),
    ]);

  const [originalsDTO, trendingDTO, newReleasesDTO, marketplaceDTO] = await Promise.all([
    Promise.all(originals.items.map((f) => FontRepository.toSummaryDTO(f))),
    Promise.all(trending.items.map((f) => FontRepository.toSummaryDTO(f))),
    Promise.all(newReleases.items.map((f) => FontRepository.toSummaryDTO(f))),
    Promise.all(marketplacePopular.items.map((f) => FontRepository.toSummaryDTO(f))),
  ]);

  return (
    <>
      <Hero />

      <FontSection
        title="Featured Originals"
        description="Designed in-house, available exclusively on Glyphora."
        fonts={originalsDTO}
        viewAllHref="/originals"
        emptyHint="Originals will appear here as soon as they're published."
      />

      <FontSection
        title="Trending fonts"
        fonts={trendingDTO}
        viewAllHref="/fonts?sort=popular"
        emptyHint="Trending fonts will appear here once customers start buying."
      />

      <div className="border-t border-border/80">
        <CategoryGrid categories={categories} />
      </div>

      <FontSection
        title="New releases"
        fonts={newReleasesDTO}
        viewAllHref="/fonts?sort=newest"
        emptyHint="New releases will appear here as designers publish fonts."
      />

      <FontSection
        title="Popular in the marketplace"
        description="From independent designers around the world."
        fonts={marketplaceDTO}
        viewAllHref="/fonts?type=MARKETPLACE&sort=popular"
        emptyHint="Marketplace fonts will appear here once designers publish."
      />

      <div className="border-t border-border/80">
        <StyleTagCloud tags={styleTags} />
      </div>

      <DesignerRail designers={designers} />
      <BundleRail bundles={bundles} />

      <div className="border-t border-border/80">
        <DesignerCta />
      </div>
    </>
  );
}

async function listStyleTags() {
  await connectDB();
  const docs = await TagModel.find({ kind: "MOOD" }).sort({ name: 1 }).limit(16).lean();
  return docs.map((t) => ({ id: t._id.toString(), name: t.name, slug: t.slug }));
}
