import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FontGrid } from "@/components/fonts/font-grid";
import { FavoriteRepository } from "@/server/repositories/favorite.repository";
import { requireSession } from "@/server/lib/session";

export const metadata: Metadata = { title: "Favorites" };

export default async function FavoritesPage() {
  const session = await requireSession();
  const favorites = await FavoriteRepository.list(session.user.id);
  const favoriteIds = new Map(favorites.map((f) => [f.font.id, f.id]));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium tracking-tight">Favorites</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/account/collections">Organize into collections</Link>
        </Button>
      </div>
      <FontGrid
        fonts={favorites.map((f) => f.font)}
        favoriteIds={favoriteIds}
        emptyTitle="No favorites yet"
        emptyDescription="Tap the heart on any font to save it here."
      />
    </div>
  );
}
