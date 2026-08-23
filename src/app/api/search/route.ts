import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { discoveryQuerySchema } from "@/types/schemas/discovery.schema";
import { queryFonts } from "@/server/lib/discovery";
import { searchProvider } from "@/server/services/search";
import { rateLimit, getClientIp } from "@/server/lib/rate-limit";

export const GET = withApiHandler(async (request: NextRequest) => {
  rateLimit(`search:${getClientIp(request)}`, 60, 60_000);

  const { searchParams } = new URL(request.url);
  const query = discoveryQuerySchema.parse(Object.fromEntries(searchParams));
  const tagSlugs = query.tags ? query.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined;

  const [result, suggestions] = await Promise.all([
    queryFonts({
      q: query.q,
      categorySlug: query.category,
      tagSlugs: tagSlugs ?? (query.tag ? [query.tag] : undefined),
      productType: query.type,
      priceMinCents: query.priceMin != null ? Math.round(query.priceMin * 100) : undefined,
      priceMaxCents: query.priceMax != null ? Math.round(query.priceMax * 100) : undefined,
      licenseKey: query.license,
      sort: query.sort ?? "relevance",
      page: query.page,
      limit: query.limit,
    }),
    query.q ? searchProvider.autocomplete(query.q) : Promise.resolve([]),
  ]);

  return apiOk({ results: result.items, total: result.total, page: result.page, totalPages: result.totalPages, suggestions });
});
