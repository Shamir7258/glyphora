# Frontend/Customer Agent Report

Scope: the customer-facing storefront end to end — discovery, font detail,
category/originals/bundles, cart, checkout, auth, and the account area — plus
every API route those pages depend on (`fonts`, `categories`, `tags`, `search`,
`favorites`, `collections`, `cart`, `checkout`, `orders`, `downloads`, `reviews`,
`webhooks/stripe`).

All three quality gates pass clean: `npm run typecheck`, `npm run lint` (1
pre-existing unrelated warning in `scripts/seed.ts`, 0 errors), `npm run build`.
Smoke-tested against the shared local `mongod` with `npm run dev` on port 3001 —
register/login, browse/search/filter, favorite, add-to-cart, apply-coupon,
checkout (stubbed-Stripe path), and an authenticated file download were all
exercised against real seeded data end to end. Test artifacts (a scratch user,
coupon, order, and one collection/favorite added to the seeded `jordan` account)
were cleaned out of the shared DB afterward.

## Pages built (`src/app/(marketing)/**`, `src/app/(auth)/**`, `src/app/account/**`)

- `fonts/page.tsx` — discovery grid. Reads `q`, `type`, `tag`, `sort`, `category`,
  `priceMin`, `priceMax`, `license`, `page` from the URL; delegates to the shared
  `FontDiscovery` server component.
- `fonts/[slug]/page.tsx` — type-specimen detail page: live preview hero (size,
  weight, letter-spacing, line-height, align, case — all instant client state, no
  reload), info stats, style switcher (only rendered when >1 `FontVariant`),
  glyph grid (A–Z/a–z/0–9/punctuation), OpenType features section (empty state
  when `openTypeFeatures` is `[]`, true for all seed fonts), three CSS-only
  "real-world" mockup cards (one uses an `images.unsplash.com` background, already
  whitelisted), licensing sidebar with a license radio-picker computing
  `basePriceCents * priceMultiplier` live, and a reviews section gated on proof of
  purchase. Calls `FontRepository.incrementViewCount()` fire-and-forget.
- `category/[slug]/page.tsx`, `originals/page.tsx` — both reuse `FontDiscovery`
  with a `locked` filter (category slug / `productType: 'ORIGINAL'`) that hides
  the corresponding filter control.
- `bundles/page.tsx` — one `FontGrid` per public `Collection`, via
  `CollectionRepository.listPublicBundles()`.
- `cart/page.tsx`, `checkout/page.tsx`, `checkout/success/page.tsx` — cart page is
  a thin shell around a client `CartView` (react-query, matches `useCart()`
  exactly). Checkout is single-page (review + customer-info form fused, not a
  route-per-step wizard) — reviewed against the spec's "review → customer info →
  payment" ordering but implemented as one scroll rather than three URLs, a scope
  call given the size of everything else in this ticket. On a Stripe-not-configured
  error it shows an inline "Checkout isn't available" alert instead of crashing
  (verified live — see Smoke test notes). Success page polls
  `GET /api/orders/[orderNumber]` every 3s up to 10 tries, with distinct
  PAID / still-pending / failed-cancelled / not-found states.
- `(auth)/login/page.tsx`, `(auth)/register/page.tsx` — new `(auth)` route group +
  layout (didn't exist before). `signIn('credentials', ...)` / `POST
  /api/auth/register` wired to `loginSchema`/`registerSchema`, both respect
  `?callbackUrl=`.
- `account/layout.tsx` — server-side `getSession()` redirect to `/login` (proxy.ts
  is the UX guard only, per ARCHITECTURE.md §5) + a sidebar shell.
  `account/page.tsx` (dashboard), `purchases`, `downloads`, `favorites`,
  `collections/[id]`, `profile` (read-only — no customer profile-edit route exists
  in API_CONTRACTS.md, so none was built), `billing` (order history table, per the
  "keep it simple" instruction).
  **Addition beyond the documented tree**: `account/collections/page.tsx` (an
  index/list view) — DEVELOPMENT.md's folder tree only lists
  `collections/[id]/page.tsx`, but without an index there's no way to discover a
  collection's id at all, so I added the list+create page. Flagged for
  DEVELOPMENT.md to be corrected.

## Shared components (`src/components/fonts/**`, `cart/**`, `checkout/**`, `auth/**`, `account/**`, `shared/pagination-nav.tsx`)

`font-discovery.tsx` + `discovery-filters.tsx` (`DiscoveryToolbar` +
`DiscoveryFilterPanel`, sharing one `FilterFields` implementation) + `font-grid.tsx`
are the reusable grid/filter unit shared by `/fonts`, `/category/[slug]`, and
`/originals`, as instructed. `font-preview-hero.tsx`, `glyph-grid.tsx`,
`style-switcher.tsx`, `opentype-features.tsx`, `real-world-examples.tsx`,
`license-picker.tsx`, `reviews-section.tsx`, `favorite-button.tsx` are the detail
page's building blocks. `FontCard` (already built) is reused unmodified everywhere
a card is needed. No new shadcn primitives were added — `ToggleGroup` isn't
installed in this repo, so the align/case controls on the preview hero are plain
styled buttons (a small `SegmentedGroup` helper) instead.

## API routes (`src/app/api/**`)

Built every route in the customer/public section of `docs/API_CONTRACTS.md`,
plus the collection add/remove-font routes the task description calls out as not
yet in that table (`POST /api/collections/[id]/fonts`,
`DELETE /api/collections/[id]/fonts/[fontId]`, and a `GET /api/collections/[id]`
detail route). `GET /api/downloads/[orderItemId]` accepts an optional `?file=`
query param to pick among multiple `DELIVERABLE` files for a font (falls back to
the first one) since a purchase can have more than one format.
`POST /api/webhooks/stripe` reads the raw body via `request.text()` and is
deliberately **not** wrapped in `withApiHandler`/the `{ok,data|error}` envelope —
it has its own external contract with Stripe.

Verified live: fonts list/detail/search/autocomplete, categories, tags,
favorites (add is idempotent — re-favoriting the same font returns the existing
row rather than erroring), collections (create/add-font), cart (add/coupon),
checkout session creation (correctly surfaces `PAYMENT_FAILED` with a friendly
message when `STRIPE_SECRET_KEY` is unset, leaves the order `PENDING` and the
cart untouched so the user can retry), orders (list + by orderNumber, with the
guest/owner/email-match authorization logic), and an authenticated download that
actually streamed a real seeded `.ttf` file end-to-end through the local-storage
signed-URL redirect.

## New repository methods / files

Per the brief, added these **new files** (didn't exist before):
`cart.repository.ts`, `order.repository.ts`, `favorite.repository.ts`,
`review.repository.ts`, `tag.repository.ts` (needed for `GET /api/tags`, wasn't
listed but is the same pattern as `category.repository.ts`).

Added **new exported functions only** (no existing export touched) to the two
named repositories I needed to extend:
- `FontRepository.listPublished()` — added optional `tagSlugs` (multi-tag AND
  filter, `tagSlug` untouched for backward compat), `priceMinCents`,
  `priceMaxCents`. Existing callers (homepage) are unaffected.
- `CategoryRepository.findBySlug()` — new, for the category page's heading/404
  and metadata.
- `CollectionRepository` — added the whole "user's own collections" surface
  (`listForUser`, `findByIdForUser`, `getDetailForUser`, `create`, `addFont`,
  `removeFont`); `listPublicBundles()` untouched.

New non-repository server files: `src/server/lib/discovery.ts` (shared
search-vs-catalog query resolution used by both the pages and
`/api/fonts`+`/api/search`), `src/server/lib/cart-owner.ts` +
`src/server/lib/guest-cart.ts` (session-or-guest-cookie resolution for every
cart/checkout route).

New DTO: `ReviewDTO` added to `src/types/dto.ts` (additive).

New zod schemas: `discovery.schema.ts`, `collection.schema.ts`,
`favorite.schema.ts`.

`use-cart.ts` hook: added an `applyCoupon` mutation alongside the existing
`cart`/`addItem`/`removeItem` (none of the existing returned fields changed
shape).

## Deviations from the docs — please double check these

1. **`Cart.coupon` field added to `cart.model.ts`.** DATABASE.md's Cart shape has
   no coupon field, but `CartDTO` (already defined by the foundation in
   `src/types/dto.ts`) has `discountCents`/`couponCode`, which can't be computed
   without the cart remembering which `Coupon` is applied. Added
   `coupon: ObjectId -> Coupon | null` (additive field, no migration needed for
   existing carts — Mongoose just treats it as unset/null). **DATABASE.md should
   be updated to include this field.**
2. **`src/server/lib/db.ts` now imports `@/server/models/index` as a side effect.**
   This was a real, reproducible bug I hit during smoke testing, not a hypothetical:
   any route/repository that `.populate()`s a ref (e.g. `Font.designer`) without
   *also* directly importing that ref's model file threw
   `MissingSchemaError: Schema hasn't been registered for model "DesignerProfile"`
   the first time it was hit in a fresh process — `GET /api/fonts` failed 100% of
   the time until this fix. Rather than scatter direct imports of every ref'd
   model into every repository, I imported the existing (and previously unused
   outside scripts) `src/server/models/index.ts` barrel once at the single
   chokepoint every DB-touching code path already calls. This affects every
   agent's code, not just mine — flagging it prominently since it's a foundation
   file.
3. **`local-provider.ts` (`SEARCH_PROVIDER=local`, the default) had a query bug**:
   it combined `$text` and `$regex` inside a single `$or`, which MongoDB
   rejects outright (`$text` cannot appear inside `$or`/`$nor`) — `GET
   /api/search?q=...` failed 100% of the time before the fix. Rewrote it to
   resolve full-text and regex matches as two separate queries (each already
   scoped by the category/tag/price/type filters) and intersect the ids, instead
   of one invalid combined query. Same input/output shape, same intent, just
   legal MongoDB. Also affects any other consumer of `LocalTextSearchProvider`.
4. **`scripts/seed.ts`** — fixed a bug where, once a `Font` doc already exists
   (true for every worktree after the first agent seeds the shared DB), the loop
   skipped writing the local preview/deliverable files entirely, even though the
   storage key (`seed/<filename>`) is deterministic and every worktree needs
   those actual files on its own disk. Now it always (re)writes the local files,
   only skipping the Mongo writes when the Font already exists. Without this,
   `npm run seed` silently left `public/uploads/` and `.local-storage/` empty in
   this worktree, and the whole preview/download pipeline was untestable.
5. **Download route status code**: API_CONTRACTS.md says `302`, ARCHITECTURE.md
   §6 says `307`. Went with `307` (ARCHITECTURE.md is more specific/deliberate
   about this one). **API_CONTRACTS.md's summary line should be corrected to
   match.**
6. **License filter (`?license=`) is accepted but not filtering.** In the current
   data model, `FontLicense` is a global set of templates that apply uniformly to
   every font (price = `basePriceCents * priceMultiplier`) — there's no per-font
   "available licenses" field on `Font` to filter against. The discovery UI still
   exposes a license select (per the spec's filter list) and the param round-trips
   through the URL/API, but it's currently a no-op on the result set. Noting this
   as a modeling gap rather than silently dropping the control.
7. **Guest checkout order-access**: `GET /api/orders/[orderNumber]` allows access
   without a session when the order has no `user` (a guest order) — the
   unguessable `orderNumber` itself is the V1 capability, matching
   DEVELOPMENT.md's "guest checkout downloads are available immediately on the
   success page" note. Orders tied to a real account still require session
   ownership (or the email-match query param, used for the documented
   "resend access" flow). Worth a second look from a security-review angle even
   though it matches the documented decision.
8. **Coupon discount doesn't reach Stripe's line items.** `OrderService.startCheckout`
   (foundation file, not modified) builds Stripe Checkout line items from each
   `OrderItem.lineTotalCents`, which I intentionally left untouched per the "use
   what's already built" instruction. My checkout route applies the coupon
   discount to the `Order`'s own `discountCents`/`grandTotalCents` *after*
   `createOrderFromCart` returns (verified correct in the DB via smoke test —
   `discountCents: 725` on a 10%-off coupon), so cart/checkout-summary/order
   pages all show the discounted total correctly — but a real Stripe session
   would currently charge the pre-discount subtotal. Since `STRIPE_SECRET_KEY`
   is unset in every environment this was tested in, this code path never
   actually reaches Stripe yet. **Whoever wires up real Stripe keys should either
   teach `OrderService.startCheckout` to consult `order.discountCents`, or pass
   Stripe's own `discounts` param.**
9. **Checkout is a single page, not three routes.** The spec's steps
   (review → customer info → payment) are implemented as one scrolling page
   rather than `/checkout/review`, `/checkout/info`, etc. — a deliberate scope
   trim given the size of the rest of this ticket.

## Known gaps

- No "add to collection" picker on the font card/detail page — collections are
  manageable from `/account/collections`, but there's no inline affordance to add
  a font to a specific collection from a font page yet (only the favorite
  heart, which still works as the default bucket).
- `account/profile/page.tsx` is read-only (name/email/roles) — there's no
  customer profile-edit endpoint in API_CONTRACTS.md's public API section to
  build against (only `/api/seller/profile` exists, which is designer-scoped).
- Multi-word/typo fuzzy search is weaker on `SEARCH_PROVIDER=local` than on Atlas
  (documented pre-existing limitation, not something I changed) — my query-bug
  fix (#3 above) restores it to working, not to Atlas-level fuzziness.
- Cart→user merge on login (a guest cart's items carrying over once someone signs
  in) isn't implemented — each is a separate cart keyed by `owner.user` vs
  `owner.guestId`. Matches DEVELOPMENT.md, which only commits to full guest-order
  account-linking as a "documented V2 nicety."

## Files touched

New: everything under `src/app/(auth)/`, `src/app/account/`,
`src/app/(marketing)/{fonts,category,originals,bundles,cart,checkout}/`,
`src/app/api/{fonts,categories,tags,search,favorites,collections,cart,checkout,orders,downloads,reviews,webhooks}/`,
`src/components/{fonts/discovery-filters.tsx,fonts/favorite-button.tsx,fonts/font-discovery.tsx,fonts/font-grid.tsx,fonts/font-preview-hero.tsx,fonts/glyph-grid.tsx,fonts/license-picker.tsx,fonts/opentype-features.tsx,fonts/real-world-examples.tsx,fonts/reviews-section.tsx,fonts/style-switcher.tsx,cart/,checkout/,auth/,account/,shared/pagination-nav.tsx}`,
`src/server/lib/{discovery.ts,cart-owner.ts,guest-cart.ts}`,
`src/server/repositories/{cart,order,favorite,review,tag}.repository.ts`,
`src/types/schemas/{discovery,collection,favorite}.schema.ts`.

Modified (all additive except the two documented bug fixes):
`src/server/lib/db.ts` (model barrel import — bug fix, #2 above),
`src/server/services/search/local-provider.ts` (query bug fix, #3 above),
`scripts/seed.ts` (local-file-write bug fix, #4 above),
`src/server/models/cart.model.ts` (+coupon field, #1 above),
`src/server/repositories/font.repository.ts`, `category.repository.ts`,
`collection.repository.ts` (new exports only), `src/types/dto.ts` (+ReviewDTO),
`src/hooks/use-cart.ts` (+applyCoupon), `src/app/error.tsx`, `src/app/not-found.tsx`
(pre-existing lint errors unrelated to my code, fixed opportunistically so
`npm run lint` passes clean as required).

## Local environment note

Changed `NEXT_PUBLIC_APP_URL`/`NEXTAUTH_URL` in my local `.env.local` (gitignored,
not committed) from port 3000 to 3001 to match the `PORT=3001` dev-server
instruction.

## Handoff verification pass (post-session-cutoff)

A follow-up pass picked this branch back up after the original session was cut
off for budget reasons right as this report was being finished (the report body
above was already complete — nothing in it needed rewriting). This pass:

- Re-ran `npm install`, `npm run db:indexes`, `npm run seed` from scratch in this
  worktree — all succeeded; confirmed real `.ttf` files land in
  `public/uploads/previews/seed/` and `.local-storage/deliverables/seed/` (8 each).
- Re-ran and confirmed all three quality gates clean: `npm run typecheck` (0
  errors), `npm run lint` (0 errors, the same 1 pre-existing unrelated
  `scripts/seed.ts` warning), `npm run build` (all 38 routes compile,
  storefront + API routes listed above all present in the route manifest).
- Re-smoke-tested end-to-end against the shared local `mongod` on port 3001:
  register/login (jordan@example.com via the real NextAuth credentials
  callback), `/fonts`, `/originals`, `/bundles`, `/cart`, `/checkout`,
  `/category/[slug]`, `/fonts/[slug]`, `/account/**` (redirect-when-anon
  confirmed, 200 when authed); `GET /api/fonts`, `/api/categories`, `/api/tags`,
  `/api/search?q=`, `/api/search/autocomplete`, guest add-to-cart, coupon apply
  (10%-off, verified `discountCents` math), `POST /api/checkout/session` with no
  Stripe key configured (returns friendly `PAYMENT_FAILED`, leaves the order
  `PENDING`, cart untouched — matches deviation #8 above), `POST /api/favorites`
  idempotency, `POST /api/collections` + add-font, `POST /api/reviews`
  proof-of-purchase gating (rejects a font never purchased; correctly reports
  "already reviewed" for the seed's own pre-existing review), and a full
  authenticated download — followed the `307` redirect from
  `GET /api/downloads/[orderItemId]` through to `/api/local-storage/download`
  and confirmed the response is a genuine, valid `TrueType Font data` file.
  All test data created during this pass (a `PENDING` order, a guest cart, a
  test coupon, a favorite, and a collection) was removed from the shared DB
  afterward; the two real seed bundles (`Wedding Invitation Set`,
  `Startup Brand Kit`) were left untouched.
- **Found and fixed one real bug during this pass**:
  `FavoriteRepository.create()` (`src/server/repositories/favorite.repository.ts`)
  read the `Font` document *before* issuing the `$inc: { favoriteCount: 1 }`
  update, so the very first favorite on a font echoed back the **pre-increment**
  `favoriteCount` in its response DTO (verified: DB value was correctly `2`
  after two calls, but the first call's JSON response said `1`). Idempotency
  itself was already correct — only the count in that one response was stale.
  Fixed by bumping the in-memory `font.favoriteCount` after the successful
  increment so the returned `FavoriteDTO.font.favoriteCount` matches the
  post-write DB state. Re-ran the full quality gate after the fix — still clean.

No other gaps were found; everything else in the "Deviations" and "Known gaps"
sections above still holds as originally written.
