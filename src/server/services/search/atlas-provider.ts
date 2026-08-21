import { connectDB } from "@/server/lib/db";
import { FontModel } from "@/server/models/font.model";
import { CategoryModel } from "@/server/models/category.model";
import { TagModel } from "@/server/models/tag.model";
import type { PipelineStage } from "mongoose";
import type { SearchProvider, SearchFilters, SearchResultRow } from "@/server/services/search/provider";

// Mongoose's PipelineStage union doesn't model Atlas Search's `$search` stage (it's
// an Atlas-only aggregation stage with a loosely-typed, deeply nested operator
// tree). Building pipelines as plain objects and casting once at the call site is
// clearer than fighting the type system stage-by-stage.
function asPipeline(stages: Record<string, unknown>[]): PipelineStage[] {
  return stages as unknown as PipelineStage[];
}

const INDEX_NAME = "fonts_search";

/**
 * MongoDB Atlas Search — requires the cluster to be Atlas (not self-hosted mongod)
 * and the `fonts_search` index to exist (created by scripts/setup-atlas-search.ts,
 * definition documented in docs/DATABASE.md). Activated via SEARCH_PROVIDER=atlas.
 */
export const AtlasSearchProvider: SearchProvider = {
  async search(query: string, filters: SearchFilters) {
    await connectDB();
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 24;
    const trimmed = query.trim();

    const compoundFilters: Record<string, unknown>[] = [{ equals: { path: "status", value: "PUBLISHED" } }];

    if (filters.categorySlug) {
      const category = await CategoryModel.findOne({ slug: filters.categorySlug }).select("name").lean();
      if (category) compoundFilters.push({ text: { path: "categoryName", query: category.name } });
      else return { rows: [], total: 0 };
    }
    if (filters.tagSlugs?.length) {
      const tags = await TagModel.find({ slug: { $in: filters.tagSlugs } }).select("name").lean();
      for (const tag of tags) compoundFilters.push({ text: { path: "tagNames", query: tag.name } });
    }
    if (filters.priceMinCents != null || filters.priceMaxCents != null) {
      compoundFilters.push({
        range: {
          path: "basePriceCents",
          ...(filters.priceMinCents != null ? { gte: filters.priceMinCents } : {}),
          ...(filters.priceMaxCents != null ? { lte: filters.priceMaxCents } : {}),
        },
      });
    }

    const should: Record<string, unknown>[] = trimmed
      ? [
          { text: { path: "name", query: trimmed, score: { boost: { value: 3 } }, fuzzy: { maxEdits: 1, prefixLength: 2 } } },
          { text: { path: "tagNames", query: trimmed, score: { boost: { value: 2 } }, fuzzy: { maxEdits: 1 } } },
          { text: { path: "designerName", query: trimmed } },
          { text: { path: "description", query: trimmed } },
        ]
      : [];

    const searchStage = {
      index: INDEX_NAME,
      compound: {
        filter: compoundFilters,
        ...(should.length ? { should, minimumShouldMatch: 1 } : {}),
      },
    };

    const sortStage = resolveSortStage(filters.sort);

    const pipeline: Record<string, unknown>[] = [
      { $search: searchStage },
      ...(sortStage ? [sortStage] : []),
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $project: { _id: 1, score: { $meta: "searchScore" } } },
    ];

    const rows = (await FontModel.aggregate(asPipeline(pipeline))) as { _id: unknown; score: number }[];

    const countPipeline = [{ $search: searchStage }, { $count: "total" }];
    const countResult = (await FontModel.aggregate(asPipeline(countPipeline))) as { total: number }[];

    return {
      rows: rows.map((r): SearchResultRow => ({ fontId: String(r._id), score: r.score })),
      total: countResult[0]?.total ?? 0,
    };
  },

  async autocomplete(query: string) {
    await connectDB();
    const trimmed = query.trim();
    if (!trimmed) return [];
    const pipeline = [
      {
        $search: {
          index: INDEX_NAME,
          autocomplete: { query: trimmed, path: "name.autocomplete" },
          compound: { filter: [{ equals: { path: "status", value: "PUBLISHED" } }] },
        },
      },
      { $limit: 8 },
      { $project: { name: 1 } },
    ];
    const results = (await FontModel.aggregate(asPipeline(pipeline))) as { name: string }[];
    return results.map((r) => r.name);
  },
};

function resolveSortStage(sort: SearchFilters["sort"]) {
  switch (sort) {
    case "newest":
      return { $sort: { publishedAt: -1 } };
    case "price_asc":
      return { $sort: { basePriceCents: 1 } };
    case "price_desc":
      return { $sort: { basePriceCents: -1 } };
    case "popular":
      return { $sort: { salesCount: -1 } };
    default:
      return null; // relevance — leave Atlas's $meta: "searchScore" ordering as-is
  }
}
