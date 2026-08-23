import { FontRepository } from "@/server/repositories/font.repository";
import { searchProvider } from "@/server/services/search";
import type { FontSummaryDTO } from "@/types/dto";
import type { Paginated } from "@/types/api";

export type DiscoverySort = "newest" | "popular" | "price_asc" | "price_desc" | "relevance";

export type DiscoveryFilters = {
  q?: string;
  categorySlug?: string;
  tagSlugs?: string[];
  productType?: "ORIGINAL" | "MARKETPLACE";
  priceMinCents?: number;
  priceMaxCents?: number;
  licenseKey?: string;
  sort?: DiscoverySort;
  page?: number;
  limit?: number;
};

/**
 * Shared "discover fonts" query used by the /fonts, /category/[slug], /originals
 * pages AND the GET /api/fonts, GET /api/search route handlers, so filter
 * resolution (search-vs-catalog-listing, sort mapping, pagination) lives in one
 * place. When `q` is present it delegates to the SearchProvider (Atlas/local);
 * otherwise it queries the catalog directly via FontRepository, which is cheaper
 * and gives exact category/publishedAt sorting.
 */
export async function queryFonts(filters: DiscoveryFilters): Promise<Paginated<FontSummaryDTO>> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 24;
  const catalogSort = filters.sort === "relevance" ? undefined : filters.sort;

  if (filters.q && filters.q.trim()) {
    const { rows, total } = await searchProvider.search(filters.q, {
      categorySlug: filters.categorySlug,
      tagSlugs: filters.tagSlugs,
      priceMinCents: filters.priceMinCents,
      priceMaxCents: filters.priceMaxCents,
      licenseKey: filters.licenseKey,
      productType: filters.productType,
      sort: filters.sort ?? "relevance",
      page,
      limit,
    });
    const fonts = await FontRepository.listByIdsPreservingOrder(rows.map((r) => r.fontId));
    const items = await Promise.all(fonts.map((f) => FontRepository.toSummaryDTO(f)));
    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  const { items: docs, total } = await FontRepository.listPublished({
    productType: filters.productType,
    categorySlug: filters.categorySlug,
    tagSlugs: filters.tagSlugs,
    priceMinCents: filters.priceMinCents,
    priceMaxCents: filters.priceMaxCents,
    sort: catalogSort,
    page,
    limit,
  });
  const items = await Promise.all(docs.map((f) => FontRepository.toSummaryDTO(f)));
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
