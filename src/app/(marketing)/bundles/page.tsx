import type { Metadata } from "next";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FontGrid } from "@/components/fonts/font-grid";
import { CollectionRepository } from "@/server/repositories/collection.repository";
import { FavoriteRepository } from "@/server/repositories/favorite.repository";
import { getSession } from "@/server/lib/session";

export const metadata: Metadata = {
  title: "Font Bundles",
  description: "Curated font pairings for weddings, startups, and more — browse and buy each font individually.",
};

export const revalidate = 60;

export default async function BundlesPage() {
  const [bundles, session] = await Promise.all([CollectionRepository.listPublicBundles(20), getSession()]);

  const allFontIds = bundles.flatMap((b) => b.fonts.map((f) => f.id));
  const favoriteIds = session?.user ? await FavoriteRepository.mapForFonts(session.user.id, allFontIds) : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">Curated</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">Font bundles</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Hand-picked font pairings for common projects. Bundles are discovery only — buy each font individually at
          its usual price.
        </p>
      </div>

      {bundles.length === 0 ? (
        <EmptyState icon={Package} title="No bundles yet" description="Curated bundles will appear here soon." />
      ) : (
        <div className="flex flex-col gap-14">
          {bundles.map((bundle) => (
            <section key={bundle.id}>
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-medium tracking-tight">{bundle.name}</h2>
                  {bundle.description && <p className="mt-1 text-muted-foreground">{bundle.description}</p>}
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {bundle.fonts.length} fonts
                </Badge>
              </div>
              <FontGrid fonts={bundle.fonts} favoriteIds={favoriteIds} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
