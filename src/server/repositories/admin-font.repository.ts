import { connectDB } from "@/server/lib/db";
import { FontModel } from "@/server/models/font.model";
import { FontFileModel } from "@/server/models/font-file.model";
import { FontVariantModel } from "@/server/models/font-variant.model";
import { StorageService } from "@/server/services/storage/storage.service";
import type { FontStatus } from "@/types/enums";

export type AdminFontListItemDTO = {
  id: string;
  slug: string;
  name: string;
  status: FontStatus;
  productType: string;
  designer: { id: string; displayName: string; username: string; isPlatform: boolean };
  category: { id: string; name: string };
  basePriceCents: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type AdminFontFileDTO = {
  id: string;
  purpose: string;
  format: string;
  fileSizeBytes: number;
  originalFilename: string;
  validated: boolean;
  validationNotes: string | null;
  createdAt: string;
};

export type AdminFontReviewDTO = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: FontStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  designer: { id: string; displayName: string; username: string; isPlatform: boolean; bio: string };
  category: { id: string; name: string };
  tags: { id: string; name: string }[];
  languages: string[];
  glyphCount: number;
  basePriceCents: number;
  currency: string;
  previewText: string;
  openTypeFeatures: { key: string; name: string; description: string; sampleText: string }[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  previewFontUrl: string | null;
  files: AdminFontFileDTO[];
  variants: { id: string; name: string; weight: number; style: string; isDefault: boolean; previewFontUrl: string | null }[];
};

const LIST_POPULATE = [
  { path: "designer", select: "username displayName isPlatform" },
  { path: "category", select: "name" },
];

function fileToDTO(f: {
  _id: unknown;
  purpose: string;
  format: string;
  fileSizeBytes: number;
  originalFilename: string;
  validated: boolean;
  validationNotes?: string | null;
  createdAt: Date;
}): AdminFontFileDTO {
  return {
    id: String(f._id),
    purpose: f.purpose,
    format: f.format,
    fileSizeBytes: f.fileSizeBytes,
    originalFilename: f.originalFilename,
    validated: f.validated,
    validationNotes: f.validationNotes ?? null,
    createdAt: f.createdAt.toISOString(),
  };
}

export const AdminFontRepository = {
  /** Moderation queue. Defaults to PENDING_REVIEW-first ordering when no status filter is given. */
  async list(params: { status?: FontStatus; page?: number; limit?: number; q?: string }) {
    await connectDB();
    const limit = params.limit ?? 20;
    const page = params.page ?? 1;
    const filter: Record<string, unknown> = {};
    if (params.status) filter.status = params.status;
    if (params.q) filter.name = { $regex: params.q, $options: "i" };

    // Default view (no explicit status filter): pending submissions first, then
    // most-recently-updated — this is what "review queue" means in practice.
    const sort: Record<string, 1 | -1> = params.status ? { updatedAt: -1 } : { updatedAt: -1 };

    const [docs, total] = await Promise.all([
      FontModel.find(filter)
        .sort(params.status ? sort : { updatedAt: -1 })
        .collation({ locale: "en" })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate(LIST_POPULATE)
        .lean(),
      FontModel.countDocuments(filter),
    ]);

    let items = docs as unknown as (typeof docs)[number][];
    if (!params.status) {
      // No filter applied: surface PENDING_REVIEW items first regardless of sort.
      const rank: Record<string, number> = { PENDING_REVIEW: 0 };
      items = [...items].sort((a, b) => (rank[(a as { status: string }).status] ?? 1) - (rank[(b as { status: string }).status] ?? 1));
    }

    const mapped: AdminFontListItemDTO[] = items.map((f) => {
      const doc = f as unknown as {
        _id: unknown;
        slug: string;
        name: string;
        status: FontStatus;
        productType: string;
        designer: { _id: unknown; displayName: string; username: string; isPlatform: boolean };
        category: { _id: unknown; name: string };
        basePriceCents: number;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
        publishedAt: Date | null;
      };
      return {
        id: String(doc._id),
        slug: doc.slug,
        name: doc.name,
        status: doc.status,
        productType: doc.productType,
        designer: {
          id: String(doc.designer._id),
          displayName: doc.designer.displayName,
          username: doc.designer.username,
          isPlatform: doc.designer.isPlatform,
        },
        category: { id: String(doc.category._id), name: doc.category.name },
        basePriceCents: doc.basePriceCents,
        currency: doc.currency,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
      };
    });

    return { items: mapped, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  },

  async countByStatus(status: FontStatus) {
    await connectDB();
    return FontModel.countDocuments({ status });
  },

  async findRaw(id: string) {
    await connectDB();
    return FontModel.findById(id);
  },

  async getReviewDetail(id: string): Promise<AdminFontReviewDTO | null> {
    await connectDB();
    const font = await FontModel.findById(id)
      .populate([
        { path: "designer", select: "username displayName isPlatform bio" },
        { path: "category", select: "name" },
        { path: "tags", select: "name" },
        { path: "reviewedBy", select: "name" },
      ])
      .lean();
    if (!font) return null;

    const doc = font as unknown as {
      _id: unknown;
      slug: string;
      name: string;
      description: string;
      status: FontStatus;
      rejectionReason: string | null;
      reviewedAt: Date | null;
      reviewedBy: { name: string } | null;
      designer: { _id: unknown; displayName: string; username: string; isPlatform: boolean; bio: string };
      category: { _id: unknown; name: string };
      tags: { _id: unknown; name: string }[];
      languages: string[];
      glyphCount: number;
      basePriceCents: number;
      currency: string;
      previewText: string;
      openTypeFeatures: { key: string; name: string; description: string; sampleText: string }[];
      createdAt: Date;
      updatedAt: Date;
      publishedAt: Date | null;
    };

    const [files, variants] = await Promise.all([
      FontFileModel.find({ font: id }).sort({ purpose: 1, createdAt: 1 }).lean(),
      FontVariantModel.find({ font: id }).sort({ weight: 1 }).lean(),
    ]);

    const previewFile = files.find((f) => f.purpose === "PREVIEW") ?? null;

    return {
      id: String(doc._id),
      slug: doc.slug,
      name: doc.name,
      description: doc.description,
      status: doc.status,
      rejectionReason: doc.rejectionReason ?? null,
      reviewedAt: doc.reviewedAt ? doc.reviewedAt.toISOString() : null,
      reviewedByName: doc.reviewedBy?.name ?? null,
      designer: {
        id: String(doc.designer._id),
        displayName: doc.designer.displayName,
        username: doc.designer.username,
        isPlatform: doc.designer.isPlatform,
        bio: doc.designer.bio ?? "",
      },
      category: { id: String(doc.category._id), name: doc.category.name },
      tags: doc.tags.map((t) => ({ id: String(t._id), name: t.name })),
      languages: doc.languages,
      glyphCount: doc.glyphCount,
      basePriceCents: doc.basePriceCents,
      currency: doc.currency,
      previewText: doc.previewText,
      openTypeFeatures: doc.openTypeFeatures ?? [],
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
      previewFontUrl: previewFile ? StorageService.getPublicPreviewUrl(previewFile.storageKey) : null,
      files: files.map(fileToDTO),
      variants: variants.map((v) => {
        const vf = v.previewFontFile ? files.find((f) => String(f._id) === String(v.previewFontFile)) : null;
        return {
          id: String(v._id),
          name: v.name,
          weight: v.weight,
          style: v.style,
          isDefault: v.isDefault,
          previewFontUrl: vf ? StorageService.getPublicPreviewUrl(vf.storageKey) : null,
        };
      }),
    };
  },
};
