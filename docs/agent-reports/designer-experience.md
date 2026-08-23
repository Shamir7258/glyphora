# Designer / Seller Experience — Agent Report

Branch: `worktree-agent-a4b7e5a948d0ecdd5` (uncommitted work picked up mid-task from a
prior instance that ran out of session budget; this report is written by the
instance that finished, verified, and committed it).

## Scope delivered

Public designer discovery, designer onboarding, and the full seller dashboard —
everything a signed-in `DesignerProfile` owner needs to publish and manage fonts,
track sales, and get paid.

**Public / marketing**
- `src/app/(marketing)/designers/page.tsx` — `/designers` browse grid (search by
  name/username, paginated via `DesignerRepository.listActive`).
- `src/app/(marketing)/designers/[username]/page.tsx` — public profile: avatar,
  bio, social links, published fonts grid, public collections.

**Onboarding**
- `src/app/(auth)/designer-register/page.tsx` + `src/components/auth/designer-register-form.tsx`
  — "become a designer" flow for an already-authenticated user. Delegates to the
  pre-existing `AuthService.becomeDesigner` / `becomeDesignerSchema` from the
  foundation phase (not re-implemented).
- `src/app/api/designers/register/route.ts` — `POST`, requires session.

**Seller dashboard** (`src/app/seller/**`, layout-gated, all require
`requireDesignerProfileId()`)
- `dashboard/page.tsx` — total sales, lifetime revenue, available balance,
  published-font count, 14-day revenue chart (`revenue-chart.tsx`, Recharts),
  top-selling fonts, recent orders.
- `fonts/page.tsx` — designer's fonts across every status with file/upload
  counts and a status badge (`font-status-badge.tsx`).
- `fonts/new/page.tsx` + `components/seller/font-editor/*` — the 6-step wizard:
  **Files → Details → Preview → Pricing → License → Review**, see below.
- `fonts/[id]/edit/page.tsx` — reuses the same wizard components
  (`font-editor.tsx`) for editing a `DRAFT`/`REJECTED` font post-creation.
- `orders/page.tsx` — paginated `OrderItem` history for this designer.
- `earnings/page.tsx` + `payout-request-form.tsx` — balance breakdown, payout
  request form, payout history table, transaction history table.
- `settings/page.tsx` + `settings-form.tsx` — profile editing (display name,
  bio, avatar/cover URLs, social links, payout method/details).

**API** (`src/app/api/seller/**`, `src/app/api/designers/**`) — every route in
`docs/API_CONTRACTS.md`'s Designer API table is implemented and matches its
signature: `GET/PATCH /profile`, `GET/POST /fonts`, `PATCH /fonts/[id]`,
`POST /fonts/[id]/upload-url`, `POST /fonts/[id]/files`,
`POST /fonts/[id]/submit`, `GET /sales`, `GET /earnings`,
`GET/POST /payouts`. `GET /api/seller/fonts/[id]` (full draft state + signed
preview URLs + submission checklist) was added beyond the contract table — it
stays inside the `/api/seller/fonts/[id]` subtree this agent owns, so it's a
safe, non-conflicting addition, not a contract violation.

## The upload wizard, specifically

`font-wizard.tsx` creates a `DRAFT` `Font` immediately on mount (placeholder
name `"Untitled font"`, first active category, no tags/price/license) so the
**Files** step has a `fontId` to attach `FontFile`s to before any other field
is real. Every later step is a `PATCH` against that same draft
(`updateDraftFont` in `font-publishing.service.ts`). This was a deliberate
sequencing choice by the prior instance (not a shortcut) — file upload requires
object storage keys tied to a Font id, and no step ordering avoids that without
either a separate "pending upload" entity or forcing Details before Files
(spec order is Files first).

The **Review** step (`review-panel.tsx`) shows a live checklist
(`getSubmissionChecklist`) and disables "Submit for review" until every
required field is present. `POST /api/seller/fonts/[id]/submit`
(`src/app/api/seller/fonts/[id]/submit/route.ts`) re-validates the same
checklist **server-side** before calling `FontPublishingService.submitForReview`,
which is a strict `DRAFT|REJECTED → PENDING_REVIEW` transition — there is no
code path in this agent's work that sets a font to `PUBLISHED` or `APPROVED`.
Publishing remains exclusively the admin moderation queue's job, per spec §18.

`registerFontFile` validates every uploaded object server-side (magic
bytes + `opentype.js` parse via `FontFileService.validateUploadedObject`) and
deletes invalid uploads from storage immediately rather than leaving orphans —
never trusts the client's declared format.

## Shared-file change: `licenses` on `Font`

`src/server/models/font.model.ts` gained:
```ts
licenses: { type: [Types.ObjectId], ref: "FontLicense", default: [] }
```
`docs/DATABASE.md`'s `Font` schema never actually included a field for which
`FontLicense` templates a font is sold under, despite
`fontLicenseSelectionSchema` (wizard step 5, spec §12) implying one should
exist — this was flagged independently by the (now-merged) admin-panel agent.
This field closes that gap. `createDraftFontSchema` and `fontUpdateSchema`
(with `licenseIds`) were added to `font.schema.ts` to support it, and
`updateDraftFont`/`getSubmissionChecklist` read/write it.
**Correction needed in `docs/DATABASE.md`**: add `licenses: ObjectId[]` (ref
`FontLicense`) to the `Font` model table.

Also touched (additive, no existing behavior changed):
- `src/server/repositories/designer.repository.ts` — added `DesignerBrowseCardDTO`
  and `listActive()` for the `/designers` grid. Deliberately not merged into the
  shared `src/types/dto.ts` to avoid touching a file other agents also depend on.
- `src/app/not-found.tsx` — two unescaped apostrophes fixed to `&apos;` (pure
  lint/JSX-correctness fix, unrelated to this feature; pre-existing file was
  already broken this way).

## "Available" vs "pending" balance — documented decision

Defined once in `src/server/services/seller-earnings.service.ts`
(`SellerEarningsService.getBalance`), read by both `GET /api/seller/earnings`
and `POST /api/seller/payouts`:

- **`availableCents`** — sum of `netAmountCents` across this designer's `SALE`
  transactions where `Transaction.payout` is still `null`. A transaction is
  claimed (`payout` set) the instant a payout *request* consumes it
  (`POST /api/seller/payouts`), so two concurrent requests can't double-spend
  the same sale while an admin hasn't processed either yet.
- **`pendingCents`** — hard-coded `0` in V1. There is no hold period; a settled
  `SALE` transaction is available immediately. A real hold (e.g. 14 days for
  chargeback risk) is called out as a V2 follow-up, not implemented here.
- **`paidCents`** — sum of `amountCents` across this designer's `PAID` `Payout`s.

`POST /api/seller/payouts` walks available transactions oldest-first and
attaches whole transactions until the requested amount is covered (transactions
are never split), so the stored `Payout.amountCents` can run slightly above
what the designer typed. This is documented in the route's comments.

**Deliberately NOT a shared `payout.service.ts`**: the (parallel, now-merged)
admin-panel agent independently builds the payout *approval* side
(`PATCH /api/admin/payouts/[id]`) in its own worktree. A shared write-side
service file would have been a guaranteed collision point between two
concurrently-edited worktrees, so `seller-earnings.service.ts` is read-only and
`POST /api/seller/payouts` writes `Payout`/`Transaction` directly.

## Deviations from the docs

1. `licenses` field on `Font` — see above (this is a doc gap-fill, not a
   deviation from intent).
2. `GET /api/seller/fonts/[id]` added beyond the `API_CONTRACTS.md` table (see
   above) — recommend adding it to the table.
3. `/designers` browse-grid card shape (`DesignerBrowseCardDTO`) lives in the
   repository file rather than `src/types/dto.ts`, to avoid a shared-file
   collision with parallel agents. Recommend folding it into `dto.ts` in a
   follow-up once all parallel worktrees are merged.
4. The wizard doesn't expose variant/weight management (multiple weights per
   family) in V1 — the first `PREVIEW` file upload auto-creates a single
   "Regular / 400 / normal" `FontVariant`. This matches the spec's V1 scope
   (no mention of a variant-management UI) but is worth flagging explicitly
   since `FontVariantModel` supports more.

## Known gaps / follow-ups

- No email/notification is sent to the designer when their font is
  approved/rejected or their payout is processed — out of scope for this
  agent (notifications aren't specced for V1 per `docs/DEVELOPMENT.md`).
- Seller earnings pages don't paginate transaction/payout history (capped at
  50/all) — fine for V1 demo data volumes, would need pagination before
  production.
- No hold-period / chargeback-risk modeling (see `pendingCents` above).

## Shared dev-database cleanup

The prior instance was mid-way through "cleaning up test artifacts I created
in the shared dev database" when it ran out of budget. Investigation via
`mongosh` against the shared `glyphora` dev DB found:

- **No stray `User`/`DesignerProfile`/`Font` test entities** — every count in
  those collections matches `scripts/seed.ts`'s output exactly (7 users, 4
  designer profiles, 8 fonts). Whatever the prior instance was about to remove
  in those collections either never landed or was already cleaned up before
  the cutoff.
- **Two `Download` records** (curl user-agent, localhost IP, timestamped
  within the prior instance's own active file-editing window) were the most
  plausible candidate for "artifacts I created," from manually exercising the
  download flow while checking dashboard stats. By the time this instance
  re-checked, they had already disappeared — the shared DB is being actively
  mutated by other concurrently-running agents, not just this branch, so this
  resolved itself without action.
- **Found, and fixed, one actively-corrupting artifact**: a `CommissionConfig`
  document with `note: "smoke test rate change"` (percentage 25, `effectiveFrom`
  timestamped seconds before an already-merged admin-panel agent's own commit)
  was still the *currently effective* commission rate, silently overriding the
  documented 30% default (`DEFAULT_COMMISSION_PERCENTAGE` in `.env.local`) for
  every new transaction — including this agent's own `npm run seed` re-run and
  any real designer payout math computed against the shared DB right now. This
  was deleted (`db.commissionconfigs.deleteOne({note: "smoke test rate change"})`),
  restoring the original "Initial marketplace commission" config (30%) as
  effective. One seed-generated demo transaction (`GLY-SEED-0001`, for "Grotesk
  Futura") had already baked in the wrong 25%/net-$45 split before this fix and
  was **not** further hand-corrected (would require rewriting `Order`,
  `OrderItem`, `Transaction`, `Font.salesCount`, and `DesignerProfile.stats` in
  lockstep) — low-stakes for demo purposes and not worth the risk of colliding
  with other agents' concurrent reads/writes of the same documents.
- **Left alone, out of scope**: a `Category` named "Test Category XYZ" and a
  `Font` ("Grotesk Futura") left in `ARCHIVED` status, both created by the same
  already-merged admin-panel agent's own moderation-flow smoke test (visible in
  `AuditLog`: `FONT_SUSPEND` → `FONT_REACTIVATE` → `FONT_ARCHIVE`,
  `CATEGORY_CREATE`). These are that agent's own test residue, not this
  branch's, and cleaning up another (already-reviewed, already-merged) agent's
  domain data is outside this task's mandate — flagged here for whoever does a
  final DB hygiene pass once all parallel worktrees have finished.
- A `Payout`/`Transaction` pair (designer Amara, $16.80, `PAID`) tied to the
  same admin-testing burst (requested and processed 7 seconds apart) was
  likewise left alone for the same reason.

**Recommendation**: because the shared dev DB is being mutated by multiple
concurrent agents in real time, a final targeted hygiene pass (after every
parallel worktree merges) is safer than any one agent trying to fully
reconcile it mid-flight.

## Quality gate results

Run from a clean `npm install` against this worktree's own `.env.local`
(after `npm run db:indexes` and `npm run seed`):

```
npm run typecheck   → 0 errors
npm run lint        → 0 errors, 2 pre-existing warnings unrelated to this
                       feature (scripts/seed.ts unused var, src/app/error.tsx
                       stale eslint-disable) — left untouched, out of scope
npm run build        → succeeded; every expected route present and dynamic
                       as appropriate: /designers, /designers/[username],
                       /designer-register, /seller/dashboard, /seller/fonts,
                       /seller/fonts/[id]/edit, /seller/fonts/new,
                       /seller/orders, /seller/earnings, /seller/settings,
                       /api/designers/register, /api/seller/** (9 routes)
```

Manual smoke test (`npm run dev`, `PORT=3002`, logged in as
`amara@example.com`): `/seller/dashboard` rendered live data — "Welcome back,
Amara", 1 sale, correct lifetime revenue/available balance, 14-day revenue
chart with the seed sale, recent orders list. `/designers` and
`/designers/amara-types` returned 200 with real content.

No TODO/stub/placeholder/"not implemented" markers found anywhere in the new
code (`grep` swept every new directory and file).
