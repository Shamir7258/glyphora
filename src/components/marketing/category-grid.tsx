import Link from "next/link";
import type { CategoryDTO, TagDTO } from "@/types/dto";

export function CategoryGrid({ categories }: { categories: CategoryDTO[] }) {
  if (categories.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">Browse by category</h2>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/category/${c.slug}`}
            className="group rounded-xl border border-border bg-card p-5 text-center transition-colors hover:border-primary/40 hover:bg-accent"
          >
            <p className="font-medium">{c.name}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function StyleTagCloud({ tags }: { tags: TagDTO[] }) {
  if (tags.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">Browse by style</h2>
      <div className="mt-6 flex flex-wrap gap-2.5">
        {tags.map((t) => (
          <Link
            key={t.id}
            href={`/fonts?tag=${t.slug}`}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent"
          >
            {t.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
