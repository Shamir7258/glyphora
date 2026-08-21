import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { FontCard } from "@/components/fonts/font-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { FontSummaryDTO } from "@/types/dto";

export function FontSection({
  title,
  description,
  fonts,
  viewAllHref,
  emptyHint,
}: {
  title: string;
  description?: string;
  fonts: FontSummaryDTO[];
  viewAllHref: string;
  emptyHint: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">{title}</h2>
          {description && <p className="mt-1.5 text-muted-foreground">{description}</p>}
        </div>
        <Link
          href={viewAllHref}
          className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex"
        >
          View all <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {fonts.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {fonts.map((font) => (
            <FontCard key={font.id} font={font} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="Nothing published here yet"
          description={emptyHint}
          className="mt-8"
        />
      )}
    </section>
  );
}
