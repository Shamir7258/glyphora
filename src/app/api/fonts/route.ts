import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { discoveryQuerySchema } from "@/types/schemas/discovery.schema";
import { queryFonts } from "@/server/lib/discovery";

export const GET = withApiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const query = discoveryQuerySchema.parse(Object.fromEntries(searchParams));

  const tagSlugs = query.tags ? query.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined;

  const result = await queryFonts({
    q: query.q,
    categorySlug: query.category,
    tagSlugs: tagSlugs ?? (query.tag ? [query.tag] : undefined),
    productType: query.type,
    priceMinCents: query.priceMin != null ? Math.round(query.priceMin * 100) : undefined,
    priceMaxCents: query.priceMax != null ? Math.round(query.priceMax * 100) : undefined,
    licenseKey: query.license,
    sort: query.sort,
    page: query.page,
    limit: query.limit,
  });

  return apiOk(result);
});
