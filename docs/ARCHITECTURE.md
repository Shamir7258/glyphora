# Glyphora — Architecture (Source of Truth)

Status: **V1 in development**. This document is authoritative. Any agent that needs to
deviate from it must update this file first and note the change in
`/docs/agent-reports/`.

## 1. Product shape

Glyphora is a premium font marketplace with two catalog sources sharing one data
model and one storefront:

- **Originals** — fonts owned by the platform operator (`designer.isPlatform = true`).
- **Marketplace** — fonts uploaded by third-party designers, commission-split on sale.

Both are instances of the same `Font` product. The storefront never branches logic on
"who owns this" beyond a `productType` field used purely for merchandising sections
(`ORIGINAL` vs `MARKETPLACE`) — pricing, licensing, checkout, download issuance, and
search all treat every published font identically.

## 2. Stack (locked)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | One codebase, Server Components for data-heavy pages, Route Handlers as the API — see §3. |
| Language | TypeScript, strict mode | Shared types between server and client. |
| UI | Tailwind CSS v4 + shadcn/ui (Radix primitives, vendored into `src/components/ui`) | Accessible primitives, no runtime CSS-in-JS, full control over the "typography as hero" visual language. |
| DB | MongoDB + Mongoose | Flexible schema for evolving font metadata; spec-mandated. |
| Search | MongoDB Atlas Search, behind a `SearchProvider` abstraction with a regex/text-index fallback for local dev (Atlas Search is Atlas-cloud-only, not available on a local `mongod`). |
| Storage | S3-compatible object storage (AWS S3 or Cloudflare R2) via `@aws-sdk/client-s3`, behind a `StorageService` abstraction. |
| Payments | Stripe (Checkout Sessions + webhooks) behind a `PaymentProvider` abstraction so Razorpay can be added later without touching order/commission logic. |
| Auth | Auth.js (`next-auth` v4) — Credentials provider (bcrypt) now, OAuth providers are a config addition, not a rewrite. JWT session strategy carrying `userId` + `roles`. |
| Forms/validation | `react-hook-form` + `zod`, one schema shared by the client form and the server action/route handler. |
| Client state | `@tanstack/react-query` for server-cache (favorites, cart, search-as-you-type); `zustand` only for pure UI state (preview-panel controls) that has no server counterpart. |
| Testing | `vitest` (unit/integration, with `mongodb-memory-server` for DB-touching tests), `@playwright/test` (E2E). |

Reasoning captured once here so sub-agents don't re-litigate it: every dependency
above was chosen because it is the single, actively-maintained library that solves
its problem — no duplicate libraries for the same concern (rule from spec §72).

## 3. Why unified Next.js, not a separate Express API

The spec allows either. We use Next.js Route Handlers under `src/app/api/**` as the
entire backend, organized in strict layers (below) so the business logic is not
tangled with framework code. If a standalone service is ever needed (e.g. for Font
Lab in V2), the `services/` and `repositories/` layers lift out unchanged — only the
thin route handlers would need to move.

**Next.js 16 conventions every agent must follow** (this is a recent major version;
do not rely on pre-15 muscle memory):

- `params` and `searchParams` are `Promise`s in `page.tsx`, `layout.tsx`,
  `route.ts`, and metadata image routes. Always `await` them.
- `cookies()`, `headers()`, `draftMode()` are async — always `await`.
- Middleware is `src/proxy.ts` exporting `proxy()`, **not** `middleware.ts` /
  `export function middleware()`. Runs on the Node.js runtime only (no edge runtime
  option in v16).
- No `serverRuntimeConfig`/`publicRuntimeConfig` — use `process.env` directly
  server-side, `NEXT_PUBLIC_*` for client-exposed values.
- `next/image` requires `images.remotePatterns` for the storage CDN host and
  `images.qualities` to include any quality value used in `<Image quality={n}>`.
- We do **not** opt into `experimental.dynamicIO` / the `"use cache"` directive for
  V1 — Server Components read Mongoose directly (not `fetch`), which is dynamic by
  default. Public, slow-changing pages (category pages, homepage sections) use
  segment-level `export const revalidate = 60` (ISR) plus `revalidatePath()` calls
  from the mutating Server Action (font approved, price changed) to bust stale ISR
  output. This avoids the experimental caching model while still giving cheap pages
  a cache.

## 4. Layered backend architecture

```
route handler (src/app/api/**/route.ts)      — HTTP concerns only: parse, call service, shape response
        │
service (src/server/services/*.ts)           — business rules: commission calc, license pricing,
        │                                       order totals, review-status transitions
repository (src/server/repositories/*.ts)    — the only files that import Mongoose models directly
        │
model (src/server/models/*.ts)               — Mongoose schemas (see DATABASE.md)
```

Rules:
- Route handlers never `import` a Mongoose model directly — only repositories do.
  This is what lets DB agents change schema/indexes without every route breaking.
- Services never touch `NextRequest`/`NextResponse` — they're plain async functions,
  directly unit-testable and directly callable from Server Actions.
- Cross-cutting concerns (auth session, RBAC, rate limiting) live in
  `src/server/lib/` and are called explicitly at the top of each route handler —
  no hidden magic middleware chain besides the auth-redirect `proxy.ts`.

## 5. Roles & authorization

Per spec §35, roles are **not** mutually exclusive. `User.roles: Role[]` is an array
subset of `CUSTOMER | DESIGNER | ADMIN | SUPER_ADMIN`. Every authenticated user
implicitly has `CUSTOMER`. `DESIGNER` is granted when a `DesignerProfile` is created.
`ADMIN`/`SUPER_ADMIN` are granted only by an existing `SUPER_ADMIN` (or the seed
script, for the first account).

Authorization is checked in two places:
1. `proxy.ts` — coarse route-group gating (`/seller/**` requires `DESIGNER`,
   `/admin/**` requires `ADMIN`/`SUPER_ADMIN`, `/account/**` requires any session),
   redirecting to `/login` when absent. This is a UX guard, not the security
   boundary.
2. `requireRole()` / `requireOwnership()` helpers called inside every mutating route
   handler and Server Action — **this is the real security boundary**, since
   `proxy.ts` alone can't be trusted to cover every code path (e.g. direct API
   calls).

## 6. Storage & font file security

`StorageService` (`src/server/services/storage/storage.service.ts`) is a
`StorageProvider`-typed switcher, same pattern as search (§8): `STORAGE_PROVIDER=s3`
selects `S3StorageProvider` (`@aws-sdk/client-s3`, pointed at either AWS S3 or an R2
endpoint via `STORAGE_ENDPOINT`); `STORAGE_PROVIDER=local` (the default) selects
`LocalStorageProvider`, which reads/writes the local filesystem and simulates
presigned URLs with an HMAC-signed, time-boxed token verified by
`src/app/api/local-storage/{upload,download}/route.ts` — this is what lets the
whole app run and be demoed with zero cloud credentials. Every other file in the
codebase calls `StorageService.*` and is provider-agnostic; only `s3-provider.ts`
and `local-provider.ts` know which backend is active. Two buckets/prefixes
(identical meaning under either provider):

- `previews/` — safe, subsetted/preview-only font assets and images. These may be
  served through a **public, unsigned** CDN URL because they are never the full
  deliverable (see `FontFileService`, §25 of spec — preview subsetting is a V1
  placeholder that serves the real file at preview scope for now; full glyph-level
  subsetting is a documented V1 limitation, see DEVELOPMENT.md).
- `deliverables/` — the actual purchased OTF/TTF/WOFF/WOFF2 files. **Never**
  publicly readable. Every download goes through
  `GET /api/downloads/[downloadTokenId]`, which:
  1. Verifies the session user owns a `PAID` `Order` containing that `FontFile`.
  2. Mints a short-lived (5 minute) S3 signed URL via
     `getSignedUrl(s3, GetObjectCommand, { expiresIn: 300 })`.
  3. Writes a `Download` record (user, order, font, file, ip, userAgent, timestamp)
     before redirecting.
  4. Redirects (`307`) to the signed URL.

Uploads (`POST /api/seller/fonts/[id]/files`) never proxy the file through the Next
server for large files — the client requests a **presigned PUT URL** from
`StorageService.getUploadUrl()`, uploads directly to the bucket, then calls back to
register the `FontFile` document. The server validates the file server-side after
upload (magic-byte sniff via `file-type`, `opentype.js` parse for real glyph/format
data — never trust the client's declared MIME type or extension) and flips
`validated: true` or rejects it.

## 7. Payments & commission

`PaymentProvider` interface (`src/server/services/payment/provider.ts`):

```ts
interface PaymentProvider {
  createCheckoutSession(input: CreateCheckoutInput): Promise<{ url: string; providerSessionId: string }>
  verifyWebhook(rawBody: string, signature: string): WebhookEvent // throws on invalid signature
  refund(providerPaymentId: string, amount?: number): Promise<void>
}
```

`StripeProvider` is the only implementation in V1. Checkout flow:

1. `POST /api/checkout/session` creates a `PENDING` `Order` + `OrderItem`s (prices
   snapshotted from the DB at this instant, never trusted from the client) and asks
   `PaymentProvider.createCheckoutSession()` for a redirect URL.
2. Stripe redirects the customer back to `/checkout/success?order=...` — this page
   shows an optimistic "processing" state and polls order status. **It never marks
   the order paid itself.**
3. `POST /api/webhooks/stripe` is the only place an order transitions to `PAID`. It
   is idempotent: the `Payment.providerPaymentId` (Stripe's event/session id) has a
   unique index, so a re-delivered webhook is a no-op on the second call. On success
   it computes, per `OrderItem`, the commission split using the
   `CommissionConfig` **effective at that moment** (never the live/current config —
   spec §22) and writes an immutable `Transaction` row.

Commission is stored as a versioned, append-only `CommissionConfig` collection
(`percentage`, `effectiveFrom`), not a single mutable settings field — this is what
makes "never recompute historical earnings from the current rate" actually
enforceable rather than just a comment.

## 8. Search

`SearchProvider` interface with two implementations selected by
`SEARCH_PROVIDER=atlas|local` env var:

- `AtlasSearchProvider` — `$search`/`$searchMeta` aggregation against the
  `fonts_search` Atlas Search index (definition in DATABASE.md). Used in
  production against MongoDB Atlas.
- `LocalTextSearchProvider` — MongoDB text index + regex prefix matching for
  autocomplete. Used in local dev / any non-Atlas deployment (self-hosted `mongod`
  does not support `$search`). Deliberately kept close enough in behavior
  (same input/output shape) that swapping providers doesn't change UI code.

## 9. Publishing abstraction (V2 Font Lab compatibility)

Per spec §41–42, `Font.creationSource: 'MARKETPLACE_UPLOAD' | 'INTERNAL_FONT_LAB'`.
V1 only ever writes `MARKETPLACE_UPLOAD`. The publishing boundary is a single
service call: `FontPublishingService.createDraftFont(input: DraftFontInput)`, which
is source-agnostic — it takes structured font data (files, metadata, variants) and
does not care whether a human filled out the upload wizard or a future Font Lab
generated the files programmatically. When Font Lab ships, it becomes a second
caller of the same service, not a new code path through the marketplace.

## 10. Folder structure

See `/docs/DEVELOPMENT.md` for the full annotated tree.

## 11. What V1 deliberately does not build

Per spec §76 and to keep this a real, finishable V1: no Font Lab, no AI generation,
no recommendation engine, no subscriptions, no true glyph-level font subsetting
service (documented limitation, §6 above), no automated payout transfers (payouts
are admin-marked-paid in V1, behind a `PayoutProcessor` interface an automated
Stripe Connect implementation can satisfy later).
