import { connectDB } from "@/server/lib/db";
import { FontModel } from "@/server/models/font.model";
import { CategoryModel } from "@/server/models/category.model";
import { TagModel } from "@/server/models/tag.model";
import { FontLicenseModel } from "@/server/models/font-license.model";
import type { SearchProvider, SearchFilters, SearchResultRow } from "@/server/services/search/provider";

/**
 * MongoDB text-index + regex based search. Used when SEARCH_PROVIDER=local (the
 * default) — a plain self-hosted `mongod` cannot run Atlas Search's `$search`
 * aggregation stage at all, so this keeps local dev and any non-Atlas deployment
 * fully functional. Deliberately mirrors AtlasSearchProvider's input/output shape
 * so the UI never has to know which one is active.
 */
export const LocalTextSearchProvider: SearchProvider = {
  async search(query: string, filters: SearchFilters) {
    await connectDB();
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 24;

    const mongoFilter: Record<string, unknown> = { status: "PUBLISHED" };

    if (filters.categorySlug) {
      const category = await CategoryModel.findOne({ slug: filters.categorySlug }).select("_id").lean();
      if (category) mongoFilter.category = category._id;
      else return { rows: [], total: 0 };
    }
    if (filters.tagSlugs?.length) {
      const tags = await TagModel.find({ slug: { $in: filters.tagSlugs } }).select("_id").lean();
      mongoFilter.tags = { $in: tags.map((t) => t._id) };
    }
    if (filters.productType) mongoFilter.productType = filters.productType;
    if (filters.priceMinCents != null || filters.priceMaxCents != null) {
      mongoFilter.basePriceCents = {
        ...(filters.priceMinCents != null ? { $gte: filters.priceMinCents } : {}),
        ...(filters.priceMaxCents != null ? { $lte: filters.priceMaxCents } : {}),
      };
    }
    if (filters.licenseKey) {
      const license = await FontLicenseModel.findOne({ key: filters.licenseKey.toUpperCase(), isActive: true })
        .select("_id")
        .lean();
      if (!license) return { rows: [], total: 0 };
      // Empty Font.licenses = "not yet configured by the designer" = sold under
      // every active license, same fallback as FontRepository.listPublished().
      mongoFilter.$or = [{ licenses: { $exists: false } }, { licenses: { $size: 0 } }, { licenses: license._id }];
    }

    const trimmed = query.trim();
    if (trimmed) {
      // Text index covers name/description/tagNames (see font.model.ts). Fall back
      // to a case-insensitive prefix/substring regex on name so short or
      // typo-heavy queries ("lux") still surface something — true fuzzy matching
      // is an Atlas Search-only capability (documented gap for local dev).
      //
      // MongoDB forbids `$text` inside `$or` (only one `$text` clause is allowed
      // per query, and never nested under $or/$nor) — combining the two in a
      // single query throws `NoQueryExecutionPlans`. Resolve each independently
      // (both already scoped by the facet filters above) and union the ids
      // instead of trying to express "text OR regex" as one query.
      const [textMatches, regexMatches] = await Promise.all([
        FontModel.find({ ...mongoFilter, $text: { $search: trimmed } })
          .select("_id")
          .lean(),
        FontModel.find({ ...mongoFilter, name: { $regex: escapeRegex(trimmed), $options: "i" } })
          .select("_id")
          .lean(),
      ]);
      const matchedIds = new Set([...textMatches, ...regexMatches].map((d) => d._id.toString()));
      mongoFilter._id = { $in: [...matchedIds] };
    }

    const sort = resolveSort(filters.sort, !!trimmed);
    const total = await FontModel.countDocuments(mongoFilter);
    const docs = await FontModel.find(mongoFilter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("_id")
      .lean();

    const rows: SearchResultRow[] = docs.map((d) => ({ fontId: d._id.toString(), score: 1 }));
    return { rows, total };
  },

  async autocomplete(query: string) {
    await connectDB();
    const trimmed = query.trim();
    if (!trimmed) return [];
    const docs = await FontModel.find({
      status: "PUBLISHED",
      name: { $regex: `^${escapeRegex(trimmed)}`, $options: "i" },
    })
      .select("name")
      .limit(8)
      .lean();
    return docs.map((d) => d.name);
  },
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveSort(sort: SearchFilters["sort"], hasQuery: boolean): Record<string, 1 | -1> {
  switch (sort) {
    case "newest":
      return { publishedAt: -1 };
    case "price_asc":
      return { basePriceCents: 1 };
    case "price_desc":
      return { basePriceCents: -1 };
    case "popular":
      return { salesCount: -1 };
    default:
      return hasQuery ? { publishedAt: -1 } : { publishedAt: -1 };
  }
}
