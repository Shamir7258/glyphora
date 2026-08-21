// Plain-object DTOs returned by the API / used by client components.
// These are deliberately NOT Mongoose documents — repositories map documents to
// these shapes so the client never depends on Mongoose internals (ObjectId, etc.
// are always serialized to strings).
import type {
  FontStatus,
  FontFormat,
  ProductType,
  CreationSource,
  OrderStatus,
  PayoutStatus,
} from "@/types/enums";

export type ID = string;

export type CategoryDTO = {
  id: ID;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
};

export type TagDTO = {
  id: ID;
  name: string;
  slug: string;
};

export type LicenseDTO = {
  id: ID;
  key: string;
  name: string;
  description: string;
  priceMultiplier: number;
  allowedUsage: string[];
  restrictions: string[];
};

export type DesignerSummaryDTO = {
  id: ID;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isPlatform: boolean;
};

export type DesignerProfileDTO = DesignerSummaryDTO & {
  bio?: string;
  coverImageUrl?: string;
  website?: string;
  socialLinks: { twitter?: string; instagram?: string; behance?: string; dribbble?: string };
  stats: { totalProducts: number; totalSalesCount: number };
  fontCount: number;
};

export type FontVariantDTO = {
  id: ID;
  name: string;
  weight: number;
  style: "normal" | "italic";
  isDefault: boolean;
  previewFontUrl: string | null; // resolved public preview URL, safe to expose
};

export type OpenTypeFeatureDTO = {
  key: string;
  name: string;
  description: string;
  sampleText: string;
};

export type FontSummaryDTO = {
  id: ID;
  slug: string;
  name: string;
  designer: DesignerSummaryDTO;
  productType: ProductType;
  category: CategoryDTO;
  tags: TagDTO[];
  basePriceCents: number;
  currency: string;
  previewText: string;
  previewFontUrl: string | null;
  favoriteCount: number;
  salesCount: number;
  publishedAt: string | null;
};

export type FontDetailDTO = FontSummaryDTO & {
  description: string;
  languages: string[];
  glyphCount: number;
  formats: FontFormat[];
  variants: FontVariantDTO[];
  openTypeFeatures: OpenTypeFeatureDTO[];
  status: FontStatus;
  creationSource: CreationSource;
  seo: { title: string; description: string; ogImage?: string };
};

/** Designer/admin view — includes review + file metadata, never storageKey. */
export type FontAdminDTO = FontDetailDTO & {
  rejectionReason: string | null;
  reviewedAt: string | null;
  files: { id: ID; purpose: string; format: FontFormat; validated: boolean; originalFilename: string }[];
};

export type CartItemDTO = {
  id: ID;
  font: FontSummaryDTO;
  license: LicenseDTO;
  variant: FontVariantDTO | null;
  unitPriceCents: number;
};

export type CartDTO = {
  id: ID;
  items: CartItemDTO[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
  couponCode: string | null;
};

export type OrderItemDTO = {
  id: ID;
  font: FontSummaryDTO;
  license: LicenseDTO;
  variant: FontVariantDTO | null;
  unitPriceCents: number;
  lineTotalCents: number;
  downloadGranted: boolean;
};

export type OrderDTO = {
  id: ID;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItemDTO[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  grandTotalCents: number;
  currency: string;
  createdAt: string;
};

export type FavoriteDTO = { id: ID; font: FontSummaryDTO; collectionId: ID | null; createdAt: string };

export type CollectionDTO = {
  id: ID;
  name: string;
  description?: string;
  isPublic: boolean;
  fonts: FontSummaryDTO[];
};

export type EarningsSummaryDTO = {
  availableCents: number;
  pendingCents: number;
  paidCents: number;
  currency: string;
};

export type PayoutDTO = {
  id: ID;
  amountCents: number;
  currency: string;
  status: PayoutStatus;
  requestedAt: string;
  processedAt: string | null;
};
