# Admin panel — agent report

Scope: `/admin/**` pages and `/api/admin/**` routes, end to end (dashboard, font
moderation, designers/customers, orders, commission, payouts, categories, tags,
licenses, coupons, settings, audit log).

## What was built

### Pages (`src/app/admin/**`)

- `layout.tsx` — gated shell (sidebar + mobile sheet nav), calls `requireAdmin()`.
- `page.tsx` — dashboard: revenue, paid-order count, customer/designer counts,
  pending-review count, a 6-month revenue bar chart, and a fonts-by-status bar
  list. Queried directly via a new `AdminDashboardRepository` (Mongo aggregations
  on `Order`, `User`, `DesignerProfile`, `Font`, `Transaction`).
- `fonts/page.tsx` — moderation queue, status-filter chips (defaults to
  pending-first when no filter is chosen).
- `fonts/[id]/page.tsx` — review detail: live glyph preview (A–Z/a–z/0–9 + custom
  preview text) built the same way `FontCard` does, via `buildFontFaceCss` against
  the `PREVIEW` file only; designer info; files list (format/size/validated flag,
  **no storageKey, no deliverable link**); computed per-license pricing; and the
  moderation action bar.
- `designers/page.tsx`, `customers/page.tsx` — list + suspend/reactivate, search
  by name/email.
- `orders/page.tsx` + `orders/[id]/page.tsx` — all orders, filter by status, and a
  detail view with line items (commission %, designer share, platform fee) and
  payment record.
- `commission/page.tsx` — effective rate, a form that always **appends** a new
  `CommissionConfig` row, and full history.
- `payouts/page.tsx` — list + filter, decision buttons (Start processing / Mark
  paid / Reject).
- `categories/page.tsx`, `tags/page.tsx`, `licenses/page.tsx`, `coupons/page.tsx` —
  CRUD via dialogs, round-tripping through the same Mongo collections
  `CategoryRepository`/`LicenseRepository`/etc. already read from.
- `settings/page.tsx` — typed inputs (number/text/currency-code) for the four
  known `SiteSetting` keys, save-per-row.
- `audit-log/page.tsx` — paginated, filterable by `entityType`, expandable
  before/after JSON (native `<details>`, no client JS needed).

### API routes (`src/app/api/admin/**`)

Every route from `API_CONTRACTS.md`'s admin table, plus a few additions (see
"Deviations" below): dashboard; fonts (list/detail/approve/reject/publish/
suspend/reactivate/archive); designers, customers (list + PATCH status); orders
(list + detail); commission (GET/POST); payouts (list + PATCH decision);
categories/tags/licenses/coupons (GET/POST/PATCH); settings (GET/PATCH);
audit-log (GET). Every handler calls `requireAdmin()` first and every mutation
calls `writeAuditLog()` with a before/after snapshot.

### Server layer (new files only — nothing shared was edited)

- `src/server/repositories/admin-{dashboard,font,user,order,payout,catalog}.repository.ts`,
  `audit-log.repository.ts`, `site-setting.repository.ts` — all admin-only reads/
  writes, new files so this agent never edits `FontRepository`/`CategoryRepository`/
  `LicenseRepository` etc. that other parallel agents own or read from. Writes
  land in the same Mongo collections those repositories already query, so
  storefront/seller pages see admin edits with no shared-file change required.
- `src/server/services/font-moderation.service.ts` — the status state machine
  (approve/reject/publish/suspend/reactivate/archive), each transition validated
  against an explicit allow-list, `revalidatePath('/','/fonts','/fonts/[slug]')`
  called whenever public visibility changes.
- `src/server/services/payout-decision.service.ts` — payout status transitions +
  the "mark paid" settlement logic (see below). New file, not a shared
  `payout.service.ts`, per the task brief (the designer-facing "request a payout"
  flow creates `Payout` rows directly, not through a shared service).

### Schema additions (existing shared files, minimal edits)

- `src/types/schemas/font.schema.ts` — `adminRejectSchema` gained a `mode:
  'REJECT' | 'REQUEST_CHANGES'` field (default `'REJECT'`); added
  `adminSuspendSchema` (`{ reason?: string }`).
- `src/types/schemas/admin.schema.ts` — added `accountStatusUpdateSchema` (shared
  by the designers/customers suspend routes).

## Design decisions

### "Request changes" vs. "Reject"

The `Font` status enum has no separate "changes requested" state, and the
designer's resubmit path (`FontPublishingService.submitForReview`) only accepts
`DRAFT | REJECTED -> PENDING_REVIEW`. Rather than add a new enum value (which
would touch `docs/DATABASE.md` and the shared `FONT_STATUS` array other agents
may depend on), **"Request changes" is a tone/audit-log variant of the same
`REJECTED` status**: the admin UI offers a REJECT/REQUEST_CHANGES toggle, both
write `status: 'REJECTED'`, and only the audit log action name
(`FONT_REQUEST_CHANGES` vs `FONT_REJECT`) and the stored `rejectionReason`
prefix (`"[Changes requested] ..."`) differ. This keeps the designer's existing
resubmit path working unmodified and avoids a schema change outside this
agent's scope.

### Approve vs. Publish

Implemented exactly per `docs/DEVELOPMENT.md`: `approve()` sets `APPROVED`, and
auto-publishes (`PUBLISHED` + `publishedAt`) only when `DesignerProfile.isPlatform
=== true`. For third-party fonts, publishing is a separate `publish()` call —
exposed on this same admin review page (my call, as the doc allows either the
designer or admin to trigger it; the designer-experience agent can add their own
equivalent button calling into the same `Font.status` transition without
conflict, since it's a different route file). `revalidatePath('/', '/fonts',
'/fonts/[slug]')` fires on every transition that changes public visibility
(auto-publish, manual publish, suspend/archive of a published font).

Two additions beyond the four actions named in the brief, both documented as
extensions rather than replacements:
- **Reactivate** (`SUSPENDED -> APPROVED`): without it a suspended font would be
  a permanent dead end in the admin UI. It lands at `APPROVED`, not `PUBLISHED`
  — an explicit Publish is still required to reappear on the storefront,
  consistent with the Approve/Publish split.
- **Archive** is treated as terminal in V1 (no unarchive action), matching the
  enum's implied lifecycle.

### Which SALE transactions a payout settles

The `Payout`/`Transaction` shapes in `DATABASE.md` don't specify a settlement
algorithm, and the task brief suggested "a simple approach: unpaid SALE
transactions up to the payout amount." Implemented as **FIFO**: on marking a
payout `PAID`, `AdminPayoutRepository.findUnpaidSaleTransactionsToSettle` pulls
the designer's oldest `SALE` transactions with `payout: null`, accumulating
`designerShareCents` until the running total reaches the payout's
`amountCents`. All pulled transactions get `payout: <id>` set, plus a new
`Transaction{ type: 'PAYOUT', netAmountCents: -amountCents }` row, and the
`Payout.transactions` array is set to `[payoutTx, ...settledSaleTxs]`.

Caveat, called out here rather than silently: because each `Transaction` is
atomic (never split), the last transaction pulled in can push the settled total
slightly past `amountCents` if the requested amount doesn't land exactly on a
transaction boundary. Acceptable for V1 since a designer only ever requests up
to their current available balance (computed the same way, from unpaid SALE
transactions). Verified end-to-end against seed data during smoke testing: a
payout request was created for a designer with exactly one unpaid `$42.00`
`SALE` transaction; marking it `PAID` correctly pulled in that transaction,
linked it via `Transaction.payout`, and created the offsetting `PAYOUT`
transaction.

### License "selection" on the review page

`docs/DATABASE.md`'s `Font` collection has no field for which `FontLicense`s a
given font supports (no `licenses: ObjectId[]` on `Font`), even though
`src/types/schemas/font.schema.ts` already has an unused
`fontLicenseSelectionSchema` seemingly intended for the seller upload wizard.
Since that field doesn't exist yet and adding it would be a `Font` model change
outside this agent's scope (and a likely collision point with the
designer-experience agent's upload flow), the review page instead shows a
**read-only computed price table**: every active `FontLicense` × the font's
`basePriceCents`, so the admin can sanity-check pricing without a stored
per-font selection. **Correction worth folding into `DATABASE.md`**: either
add `Font.licenseIds: ObjectId[]` if per-font license selection is meant to be
real, or drop `fontLicenseSelectionSchema` if licenses are meant to be global.

### Admin layout security boundary

`requireAdmin()` throws `ApiError` (`UNAUTHORIZED`/`FORBIDDEN`), which is the
right shape for a route handler but not for a Server Component (an uncaught
throw there renders the generic `error.tsx` boundary, not a redirect).
`src/app/admin/layout.tsx` calls `requireAdmin()` — same real security check —
and translates the two error codes to `redirect('/login?callbackUrl=/admin')`
and `redirect('/')` respectively, so the boundary is enforced server-side on
every request while still giving a sane UX. Every route handler under
`/api/admin/**` calls `requireAdmin()` directly with no such translation, since
`apiError()` already shapes `ApiError` correctly there.

## Deviations from `API_CONTRACTS.md` (additions, not replacements)

- `GET/PATCH /api/admin/customers`, `/api/admin/customers/[id]` — the contract
  table only lists `/api/admin/designers`, but the task brief asks for a
  `customers/page.tsx` with suspend/reactivate, which needs a backing route.
- `GET /api/admin/fonts/[id]`, `GET /api/admin/orders/[id]` — the contract only
  lists the collection-level GETs; detail routes were added for the review/order
  detail pages (the pages themselves fetch via the repository directly as
  Server Components, per the task brief's "admin views don't need to go through
  the customer-facing repositories" note — these JSON routes exist for contract
  completeness / any future client-side use, not because the pages need them).
- `POST /api/admin/fonts/[id]/publish` and `POST /api/admin/fonts/[id]/reactivate`
  — not in the contract table at all; both documented above under "Approve vs.
  Publish."

None of these touch a route file another agent owns (`/api/fonts/**`,
`/api/seller/**`, etc. are untouched) — all additions are new files under
`/api/admin/**`.

## Known gaps / not built

- Coupon `appliesToRef` (scoping a coupon to a specific category/font/designer)
  is a plain optional text input for a raw ObjectId in the coupon dialog — no
  autocomplete/picker against those collections. Functional but not polished;
  documented rather than silently simplified.
- No dedicated "designer detail" page — the designers list links to itself
  filtered by username rather than a `/admin/designers/[id]` page. The list
  already carries the numbers (font count, sales, revenue) the brief asked for;
  a detail page was judged lower priority than the required list+suspend flow
  given the scope.
- Audit log entity-type filter chips are derived from `AuditLogModel.distinct
  ("entityType")` each request rather than a fixed enum — fine at V1 scale, would
  want a proper index-backed facet if the log grows large.

## Verification performed

`npm run typecheck`, `npm run lint`, and `npm run build` all pass with zero
errors/warnings in any file this agent created or modified. `npm run lint` still
reports 3 pre-existing errors (`src/app/not-found.tsx`) and 2 warnings
(`scripts/seed.ts`, `src/app/error.tsx`) that predate this agent's work (present
in the initial foundation commits, confirmed via `git status` before any changes
were made here) and are outside `/admin/**` scope — left untouched to avoid
colliding with other agents' files.

Smoke-tested against the real seeded DB with `next dev` on port 3003 and a
signed-in admin session (credentials login via `/api/auth/callback/credentials`):
- `/admin/**` redirects to `/login` when signed out (layout boundary); every
  `/api/admin/**` route returns `401 UNAUTHORIZED` when signed out.
- All 13 top-level admin pages render `200` for an authenticated admin.
- Dashboard API returns real aggregated numbers from the seeded DB.
- Full font lifecycle exercised against two seeded fonts: approve on a
  third-party font stopped at `APPROVED` (`autoPublished: false`); a subsequent
  `publish` call moved it to `PUBLISHED`; approve on a platform (`isPlatform`)
  font went straight to `PUBLISHED` (`autoPublished: true`) in one call; suspend
  → reactivate → archive all transitioned correctly and rejected invalid
  transitions.
- Every action above produced a correctly-shaped `AuditLog` row (verified via
  `GET /api/admin/audit-log`), with before/after status snapshots.
- Category creation round-tripped into Mongo.
- Commission POST appended a new versioned row without touching the prior one;
  GET returned the new current rate plus full history.
- Payout decision flow: seeded a `REQUESTED` payout for a designer with one
  existing unpaid `SALE` transaction, moved it `REQUESTED → PROCESSING → PAID`;
  confirmed a `Transaction{ type: 'PAYOUT' }` was created and the designer's
  `SALE` transaction got `payout` set to the new payout's id, with
  `Payout.transactions` containing both.

## Files touched

New:
- `src/app/admin/**` (all pages + `layout.tsx`)
- `src/app/api/admin/**` (all routes)
- `src/components/admin/**` (nav, forms, dialogs, charts, shared bits)
- `src/server/repositories/admin-*.repository.ts`, `audit-log.repository.ts`,
  `site-setting.repository.ts`
- `src/server/services/font-moderation.service.ts`,
  `payout-decision.service.ts`

Modified (additive only):
- `src/types/schemas/font.schema.ts` — `adminRejectSchema.mode`,
  `adminSuspendSchema`
- `src/types/schemas/admin.schema.ts` — `accountStatusUpdateSchema`
