import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FontDiscovery, type DiscoverySearchParams } from "@/components/fonts/font-discovery";
import { CategoryRepository } from "@/server/repositories/category.repository";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await CategoryRepository.findBySlug(slug);
  if (!category) return { title: "Category" };
  return {
    title: category.name,
    description: category.description || `Browse ${category.name} fonts on Glyphora.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<DiscoverySearchParams>;
}) {
  const { slug } = await params;
  const [category, resolvedSearchParams] = await Promise.all([CategoryRepository.findBySlug(slug), searchParams]);
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">Category</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">{category.name}</h1>
        {category.description && <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>}
      </div>
      <FontDiscovery
        basePath={`/category/${category.slug}`}
        searchParams={resolvedSearchParams}
        locked={{ categorySlug: category.slug }}
      />
    </div>
  );
}
