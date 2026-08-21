import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { CollectionDTO } from "@/types/dto";

export function BundleRail({ bundles }: { bundles: CollectionDTO[] }) {
  if (bundles.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">Font bundles</h2>
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {bundles.map((bundle) => (
          <div key={bundle.id} className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium">{bundle.name}</h3>
                {bundle.description && <p className="mt-1 text-sm text-muted-foreground">{bundle.description}</p>}
              </div>
              <Badge variant="secondary">{bundle.fonts.length} fonts</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {bundle.fonts.slice(0, 6).map((f) => (
                <Link
                  key={f.id}
                  href={`/fonts/${f.slug}`}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-accent"
                >
                  {f.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
