import { DiscoveryFilterPanel, DiscoveryToolbar } from "@/components/fonts/discovery-filters";
import { FontGrid } from "@/components/fonts/font-grid";
import { PaginationNav } from "@/components/shared/pagination-nav";
import { queryFonts, type DiscoveryFilters, type DiscoverySort } from "@/server/lib/discovery";
import { CategoryRepository } from "@/server/repositories/category.repository";
import { TagRepository } from "@/server/repositories/tag.repository";
import { LicenseRepository } from "@/server/repositories/license.repository";
import { FavoriteRepository } from "@/server/repositories/favorite.repository";
import { getSession } from "@/server/lib/session";

export type DiscoverySearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

const SORT_VALUES: DiscoverySort[] = ["newest", "popular", "price_asc", "price_desc", "relevance"];

/**
 * Reusable "discover fonts" section — filter toolbar + sidebar + grid +
 * pagination — shared by /fonts, /category/[slug], and /originals so filtering
 * behaves identically everywhere (per docs/DEVELOPMENT.md folder structure).
 * `locked` fixes a filter dimension for a dedicated route (e.g. the category
 * page hides the category selector since it's implied by the URL).
 */
export async function FontDiscovery({
  basePath,
  searchParams,
  locked,
}: {
  basePath: string;
  searchParams: DiscoverySearchParams;
  locked?: { productType?: DiscoveryFilters["productType"]; categorySlug?: string };
}) {
  const q = first(searchParams.q);
  const category = locked?.categorySlug ?? first(searchParams.category);
  const tag = first(searchParams.tag);
  const type = locked?.productType ?? (first(searchParams.type) as DiscoveryFilters["productType"] | undefined);
  const priceMin = first(searchParams.priceMin);
  const priceMax = first(searchParams.priceMax);
  const license = first(searchParams.license);
  const sortParam = first(searchParams.sort);
  const sort = SORT_VALUES.includes(sortParam as DiscoverySort) ? (sortParam as DiscoverySort) : undefined;
  const page = Number(first(searchParams.page) ?? "1") || 1;

  const [categories, tags, licenses, session] = await Promise.all([
    CategoryRepository.listActive(),
    TagRepository.listAll(),
    LicenseRepository.listActive(),
    getSession(),
  ]);

  const result = await queryFonts({
    q,
    categorySlug: category,
    tagSlugs: tag ? [tag] : undefined,
    productType: type,
    priceMinCents: priceMin ? Math.round(Number(priceMin) * 100) : undefined,
    priceMaxCents: priceMax ? Math.round(Number(priceMax) * 100) : undefined,
    licenseKey: license,
    sort,
    page,
    limit: 24,
  });

  const favoriteIds = session?.user
    ? await FavoriteRepository.mapForFonts(
        session.user.id,
        result.items.map((f) => f.id)
      )
    : undefined;

  const filterProps = {
    categories,
    tags,
    licenses,
    hideCategory: !!locked?.categorySlug,
    hideType: !!locked?.productType,
  };

  return (
    <div className="flex flex-col gap-6">
      <DiscoveryToolbar basePath={basePath} {...filterProps} />
      <div className="flex gap-8">
        <DiscoveryFilterPanel basePath={basePath} {...filterProps} />
        <div className="min-w-0 flex-1">
          <p className="mb-4 text-sm text-muted-foreground">
            {result.total} {result.total === 1 ? "font" : "fonts"}
          </p>
          <FontGrid fonts={result.items} favoriteIds={favoriteIds} />
          <PaginationNav basePath={basePath} searchParams={searchParams} page={result.page} totalPages={result.totalPages} />
        </div>
      </div>
    </div>
  );
}
