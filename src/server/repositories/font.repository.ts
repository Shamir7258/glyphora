import { connectDB } from "@/server/lib/db";
import { FontModel, type FontDoc } from "@/server/models/font.model";
import { FontVariantModel } from "@/server/models/font-variant.model";
import { FontFileModel } from "@/server/models/font-file.model";
import { StorageService } from "@/server/services/storage/storage.service";
import type { HydratedDocument, Types } from "mongoose";
import type { FontSummaryDTO, FontDetailDTO, FontVariantDTO, DesignerSummaryDTO, CategoryDTO, TagDTO } from "@/types/dto";

type PopulatedFont = Omit<HydratedDocument<FontDoc>, "designer" | "category" | "tags"> & {
  designer: { _id: Types.ObjectId; username: string; displayName: string; avatarUrl?: string | null; isPlatform: boolean };
  category: { _id: Types.ObjectId; name: string; slug: string; description?: string; icon?: string };
  tags: { _id: Types.ObjectId; name: string; slug: string }[];
};

const SUMMARY_POPULATE = [
  { path: "designer", select: "username displayName avatarUrl isPlatform" },
  { path: "category", select: "name slug description icon" },
  { path: "tags", select: "name slug" },
];

function toDesignerSummary(d: PopulatedFont["designer"]): DesignerSummaryDTO {
  return {
    id: d._id.toString(),
    username: d.username,
    displayName: d.displayName,
    avatarUrl: d.avatarUrl ?? undefined,
    isPlatform: d.isPlatform,
  };
}

function toCategory(c: PopulatedFont["category"]): CategoryDTO {
  return { id: c._id.toString(), name: c.name, slug: c.slug, description: c.description, icon: c.icon };
}

function toTags(tags: PopulatedFont["tags"]): TagDTO[] {
  return tags.map((t) => ({ id: t._id.toString(), name: t.name, slug: t.slug }));
}

async function resolveDefaultPreviewUrl(fontId: Types.ObjectId): Promise<string | null> {
  const file = await FontFileModel.findOne({ font: fontId, purpose: "PREVIEW" }).sort({ createdAt: 1 }).lean();
  if (!file) return null;
  return StorageService.getPublicPreviewUrl(file.storageKey);
}

export const FontRepository = {
  async toSummaryDTO(font: PopulatedFont): Promise<FontSummaryDTO> {
    return {
      id: font._id.toString(),
      slug: font.slug,
      name: font.name,
      designer: toDesignerSummary(font.designer),
      productType: font.productType,
      category: toCategory(font.category),
      tags: toTags(font.tags),
      basePriceCents: font.basePriceCents,
      currency: font.currency,
      previewText: font.previewText,
      previewFontUrl: await resolveDefaultPreviewUrl(font._id),
      favoriteCount: font.favoriteCount,
      salesCount: font.salesCount,
      publishedAt: font.publishedAt ? font.publishedAt.toISOString() : null,
    };
  },

  async toDetailDTO(font: PopulatedFont): Promise<FontDetailDTO> {
    const summary = await this.toSummaryDTO(font);
    const variantDocs = await FontVariantModel.find({ font: font._id }).sort({ weight: 1 }).lean();
    const files = await FontFileModel.find({ font: font._id }).select("format purpose").lean();

    const variants: FontVariantDTO[] = await Promise.all(
      variantDocs.map(async (v) => {
        let previewFontUrl: string | null = null;
        if (v.previewFontFile) {
          const file = await FontFileModel.findById(v.previewFontFile).lean();
          if (file) previewFontUrl = StorageService.getPublicPreviewUrl(file.storageKey);
        }
        return {
          id: v._id.toString(),
          name: v.name,
          weight: v.weight,
          style: v.style as "normal" | "italic",
          isDefault: v.isDefault,
          previewFontUrl,
        };
      })
    );

    return {
      ...summary,
      description: font.description,
      languages: font.languages,
      glyphCount: font.glyphCount,
      formats: [...new Set(files.map((f) => f.format))],
      variants,
      openTypeFeatures: font.openTypeFeatures ?? [],
      status: font.status,
      creationSource: font.creationSource,
      seo: {
        title: font.seo?.title || `${font.name} — Glyphora`,
        description: font.seo?.description || font.description.slice(0, 155),
        ogImage: font.seo?.ogImage ?? undefined,
      },
    };
  },

  async findPublishedBySlug(slug: string) {
    await connectDB();
    const font = await FontModel.findOne({ slug, status: "PUBLISHED" }).populate(SUMMARY_POPULATE);
    return font as PopulatedFont | null;
  },

  /** Any status — for the owning designer or an admin reviewing a submission. */
  async findByIdUnfiltered(id: string) {
    await connectDB();
    const font = await FontModel.findById(id).populate(SUMMARY_POPULATE);
    return font as PopulatedFont | null;
  },

  async listPublished(params: {
    productType?: "ORIGINAL" | "MARKETPLACE";
    categorySlug?: string;
    tagSlug?: string;
    designerId?: string;
    sort?: "newest" | "popular" | "price_asc" | "price_desc";
    limit?: number;
    page?: number;
    ids?: string[];
  }) {
    await connectDB();
    const filter: Record<string, unknown> = { status: "PUBLISHED" };
    if (params.productType) filter.productType = params.productType;
    if (params.designerId) filter.designer = params.designerId;
    if (params.ids) filter._id = { $in: params.ids };

    if (params.categorySlug) {
      const { CategoryModel } = await import("@/server/models/category.model");
      const category = await CategoryModel.findOne({ slug: params.categorySlug }).select("_id").lean();
      if (!category) return { items: [] as PopulatedFont[], total: 0 };
      filter.category = category._id;
    }
    if (params.tagSlug) {
      const { TagModel } = await import("@/server/models/tag.model");
      const tag = await TagModel.findOne({ slug: params.tagSlug }).select("_id").lean();
      if (!tag) return { items: [] as PopulatedFont[], total: 0 };
      filter.tags = tag._id;
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest: { publishedAt: -1 },
      popular: { salesCount: -1 },
      price_asc: { basePriceCents: 1 },
      price_desc: { basePriceCents: -1 },
    };
    const sort = sortMap[params.sort ?? "newest"];
    const limit = params.limit ?? 24;
    const page = params.page ?? 1;

    const [items, total] = await Promise.all([
      FontModel.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate(SUMMARY_POPULATE),
      FontModel.countDocuments(filter),
    ]);

    return { items: items as unknown as PopulatedFont[], total };
  },

  async listByIdsPreservingOrder(ids: string[]) {
    await connectDB();
    const docs = (await FontModel.find({ _id: { $in: ids }, status: "PUBLISHED" }).populate(
      SUMMARY_POPULATE
    )) as unknown as PopulatedFont[];
    const byId = new Map(docs.map((d) => [d._id.toString(), d]));
    return ids.map((id) => byId.get(id)).filter((d): d is PopulatedFont => !!d);
  },

  async incrementViewCount(fontId: string) {
    await connectDB();
    await FontModel.findByIdAndUpdate(fontId, { $inc: { viewCount: 1 } });
  },
};
