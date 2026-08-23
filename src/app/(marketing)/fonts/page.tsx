import type { Metadata } from "next";
import { FontDiscovery, type DiscoverySearchParams } from "@/components/fonts/font-discovery";

export const metadata: Metadata = {
  title: "Browse Fonts",
  description: "Discover premium fonts from Glyphora Originals and independent designers. Filter by category, style, price, and license.",
};

export default async function FontsPage({
  searchParams,
}: {
  searchParams: Promise<DiscoverySearchParams>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Browse fonts</h1>
        <p className="mt-2 text-muted-foreground">
          Every typeface on Glyphora — Originals and marketplace, in one place.
        </p>
      </div>
      <FontDiscovery basePath="/fonts" searchParams={params} />
    </div>
  );
}
