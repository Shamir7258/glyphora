# Glyphora — API Contracts (Source of Truth)

All routes live under `src/app/api/**/route.ts` (Next.js Route Handlers). Response
envelope is consistent everywhere:

```ts
// success
{ ok: true, data: T }
// error
{ ok: false, error: { code: string, message: string, fieldErrors?: Record<string,string[]> } }
```

`code` is a stable machine-readable string (`UNAUTHORIZED`, `NOT_FOUND`,
`VALIDATION_ERROR`, `FORBIDDEN`, `CONFLICT`, `RATE_LIMITED`, `PAYMENT_FAILED`,
`INTERNAL_ERROR`). The client never shows `message` for `INTERNAL_ERROR` — it maps
codes to friendly copy (spec §38). Shared types: `src/types/api.ts`
(`ApiResponse<T>`), `src/types/errors.ts` (`ApiErrorCode`).

Route namespaces are partitioned by owner so parallel agents never edit the same
route file:

- `/api/auth/**` — Auth.js handler + `/api/auth/register` (credentials sign-up).
- `/api/fonts/**`, `/api/categories`, `/api/tags`, `/api/search`,
  `/api/favorites/**`, `/api/collections/**`, `/api/cart/**`, `/api/checkout/**`,
  `/api/orders/**`, `/api/downloads/**`, `/api/reviews/**` — **customer/public API**
  (backend agent).
- `/api/seller/**` — designer-only, ownership-checked against the session's
  `DesignerProfile` (designer-experience agent).
- `/api/admin/**` — admin-only (admin agent).
- `/api/webhooks/stripe` — payments agent, no session auth, Stripe signature
  verification instead.

## Public / customer API

| Method & path | Auth | Body / Query | Returns |
|---|---|---|---|
| `GET /api/fonts` | none | `?category=&tags=&priceMin=&priceMax=&license=&sort=&page=&limit=` | paginated `FontSummary[]` |
| `GET /api/fonts/[slug]` | none | — | `FontDetail` (includes variants, files metadata sans storageKey, openTypeFeatures) |
| `GET /api/search?q=` | none | `q, filters...` | `{ results: FontSummary[], suggestions: string[] }` |
| `GET /api/search/autocomplete?q=` | none | `q` | `string[]` (debounced client-side to ~150ms) |
| `GET /api/categories` | none | — | `Category[]` |
| `GET /api/tags` | none | — | `Tag[]` |
| `POST /api/favorites` | session | `{ fontId, collectionId? }` | `Favorite` |
| `DELETE /api/favorites/[id]` | session, owner | — | `{ ok: true }` |
| `GET /api/collections` | session | — | `Collection[]` (with populated fonts) |
| `POST /api/collections` | session | `{ name, description? }` | `Collection` |
| `GET /api/cart` | session or guest cookie | — | `Cart` |
| `POST /api/cart/items` | session or guest | `{ fontId, licenseId, variantId? }` | `Cart` |
| `DELETE /api/cart/items/[itemId]` | session or guest | — | `Cart` |
| `POST /api/cart/coupon` | session or guest | `{ code }` | `Cart` with discount applied |
| `POST /api/checkout/session` | session or guest (customerInfo required for guest) | `{ customerInfo }` | `{ redirectUrl }` — creates `PENDING` Order, Stripe Checkout Session |
| `GET /api/orders/[orderNumber]` | session, owner (or guest email match) | — | `Order` |
| `GET /api/orders` | session | `?page=&limit=` | paginated `Order[]` |
| `GET /api/downloads/[orderItemId]` | session, owner | — | `302` redirect to signed URL (not JSON) |
| `POST /api/reviews` | session, must own a `PAID` order for the font | `{ fontId, rating, comment }` | `Review` |

## Designer API (`/api/seller/**`)

| Method & path | Returns |
|---|---|
| `GET /api/seller/profile` / `PATCH /api/seller/profile` | `DesignerProfile` |
| `GET /api/seller/fonts` | designer's own fonts, any status |
| `POST /api/seller/fonts` | create `DRAFT` font, returns `{ fontId }` |
| `PATCH /api/seller/fonts/[id]` | update metadata (only while `DRAFT`/`REJECTED`) |
| `POST /api/seller/fonts/[id]/upload-url` | `{ purpose, format }` → `{ uploadUrl, storageKey }` presigned PUT |
| `POST /api/seller/fonts/[id]/files` | register uploaded file `{ storageKey, purpose, format, variantId? }`, triggers server-side validation |
| `POST /api/seller/fonts/[id]/submit` | `DRAFT → PENDING_REVIEW` (validates all required steps are complete) |
| `GET /api/seller/sales` | `?page=` — this designer's `OrderItem`s |
| `GET /api/seller/earnings` | `{ availableCents, pendingCents, paidCents }` + `Transaction[]` |
| `POST /api/seller/payouts` | `{ amountCents }` → `Payout` (status `REQUESTED`) |
| `GET /api/seller/payouts` | `Payout[]` |

## Admin API (`/api/admin/**`)

| Method & path | Returns |
|---|---|
| `GET /api/admin/dashboard` | revenue/orders/customers/designers/pending-count summary |
| `GET /api/admin/fonts?status=PENDING_REVIEW` | moderation queue |
| `POST /api/admin/fonts/[id]/approve` | `PENDING_REVIEW → APPROVED` (then designer/admin explicitly publishes → `PUBLISHED`, or approve auto-publishes for `isPlatform` designer fonts — see DEVELOPMENT.md decision log) |
| `POST /api/admin/fonts/[id]/reject` | `{ reason }` (required) → `REJECTED` |
| `POST /api/admin/fonts/[id]/suspend` \| `/archive` | status transition |
| `GET /api/admin/designers` / `PATCH /api/admin/designers/[id]` | list/suspend designers |
| `GET /api/admin/orders` | all orders |
| `GET /api/admin/commission` / `POST /api/admin/commission` | current + history / create new `CommissionConfig` row (never edits an existing row) |
| `GET /api/admin/payouts` / `PATCH /api/admin/payouts/[id]` | list / mark `PROCESSING`\|`PAID`\|`REJECTED` |
| `GET/POST/PATCH /api/admin/categories` | CRUD |
| `GET/POST/PATCH /api/admin/tags` | CRUD |
| `GET/POST/PATCH /api/admin/licenses` | CRUD on `FontLicense` |
| `GET/POST/PATCH /api/admin/coupons` | CRUD |
| `GET/PATCH /api/admin/settings` | `SiteSetting` key/value |
| `GET /api/admin/audit-log` | paginated, filterable by entityType |

## Webhooks

| Method & path | Auth |
|---|---|
| `POST /api/webhooks/stripe` | Stripe signature header (`stripe-signature`), verified via `PaymentProvider.verifyWebhook`. Idempotent on `Payment.providerPaymentId` unique index. |

## Validation

Every route handler validates its input with a `zod` schema from
`src/types/schemas/*.ts` **before** calling a service. The same schema is reused by
`react-hook-form`'s resolver on the client, so client and server validation cannot
drift. On failure, respond `400` with `code: 'VALIDATION_ERROR'` and `fieldErrors`.

## Rate limiting

`src/server/lib/rate-limit.ts` — simple in-memory token bucket keyed by
`ip + route`, sufficient for a single-instance V1 deployment (documented limitation:
swap for a Redis-backed limiter before scaling to multiple instances). Applied to:
`/api/auth/register`, `/api/auth/[...nextauth]` (credentials attempt), `/api/search`,
`/api/checkout/session`, `/api/reviews`.
