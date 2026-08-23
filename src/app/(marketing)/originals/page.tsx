import type { Metadata } from "next";
import { FontDiscovery, type DiscoverySearchParams } from "@/components/fonts/font-discovery";

export const metadata: Metadata = {
  title: "Glyphora Originals",
  description: "Fonts designed in-house by the Glyphora team, available exclusively on Glyphora.",
};

export default async function OriginalsPage({
  searchParams,
}: {
  searchParams: Promise<DiscoverySearchParams>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">Glyphora Originals</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          Designed in-house, available exclusively here
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Our own type foundry — every Original is designed, reviewed, and published directly by the Glyphora team.
        </p>
      </div>
      <FontDiscovery basePath="/originals" searchParams={params} locked={{ productType: "ORIGINAL" }} />
    </div>
  );
}
