import { Type } from "lucide-react";
import { FontCard } from "@/components/fonts/font-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { FontSummaryDTO } from "@/types/dto";

export function FontGrid({
  fonts,
  favoriteIds,
  emptyTitle = "No fonts found",
  emptyDescription = "Try adjusting your filters or search for something else.",
}: {
  fonts: FontSummaryDTO[];
  favoriteIds?: Map<string, string>;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (fonts.length === 0) {
    return <EmptyState icon={Type} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {fonts.map((font) => (
        <FontCard key={font.id} font={font} favoriteId={favoriteIds?.get(font.id) ?? null} />
      ))}
    </div>
  );
}
