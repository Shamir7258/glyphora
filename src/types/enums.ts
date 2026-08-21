// Enums shared between server (Mongoose schema `enum`) and client (UI labels,
// zod validation). Single source of truth — see docs/DATABASE.md.

export const ROLES = ["CUSTOMER", "DESIGNER", "ADMIN", "SUPER_ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const FONT_STATUS = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "REJECTED",
  "SUSPENDED",
  "ARCHIVED",
] as const;
export type FontStatus = (typeof FONT_STATUS)[number];

export const FONT_FORMAT = ["OTF", "TTF", "WOFF", "WOFF2"] as const;
export type FontFormat = (typeof FONT_FORMAT)[number];

export const FONT_FILE_PURPOSE = ["PREVIEW", "DELIVERABLE"] as const;
export type FontFilePurpose = (typeof FONT_FILE_PURPOSE)[number];

export const PRODUCT_TYPE = ["ORIGINAL", "MARKETPLACE"] as const;
export type ProductType = (typeof PRODUCT_TYPE)[number];

export const CREATION_SOURCE = ["MARKETPLACE_UPLOAD", "INTERNAL_FONT_LAB"] as const;
export type CreationSource = (typeof CREATION_SOURCE)[number];

export const ORDER_STATUS = ["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const PAYMENT_STATUS = ["REQUIRES_PAYMENT", "SUCCEEDED", "FAILED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const PAYOUT_STATUS = ["REQUESTED", "PROCESSING", "PAID", "REJECTED"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUS)[number];

export const TRANSACTION_TYPE = ["SALE", "REFUND", "PAYOUT"] as const;
export type TransactionType = (typeof TRANSACTION_TYPE)[number];

export const COUPON_TYPE = ["PERCENTAGE", "FIXED"] as const;
export type CouponType = (typeof COUPON_TYPE)[number];

export const COUPON_APPLIES_TO = ["ALL", "CATEGORY", "FONT", "DESIGNER"] as const;
export type CouponAppliesTo = (typeof COUPON_APPLIES_TO)[number];

export const ANALYTICS_EVENT_TYPE = [
  "FONT_VIEW",
  "FONT_PREVIEW",
  "SEARCH",
  "FAVORITE",
  "ADD_TO_CART",
  "PURCHASE",
  "DOWNLOAD",
] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPE)[number];

export const REVIEW_STATUS = ["PUBLISHED", "HIDDEN"] as const;
export type ReviewStatus = (typeof REVIEW_STATUS)[number];

export const ACCOUNT_STATUS = ["ACTIVE", "SUSPENDED"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUS)[number];

export const TAG_KIND = ["CATEGORY_STYLE", "MOOD"] as const;
export type TagKind = (typeof TAG_KIND)[number];
