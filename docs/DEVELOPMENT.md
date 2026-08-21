# Glyphora — Development Guide

## Folder structure

```
src/
  app/
    (marketing)/                 # public storefront, shares a layout with header/footer
      page.tsx                   # homepage
      fonts/
        page.tsx                 # /fonts discovery grid
        [slug]/page.tsx           # /fonts/[slug] detail
      originals/page.tsx
      category/[slug]/page.tsx
      designers/
        page.tsx
        [username]/page.tsx
      bundles/page.tsx
      cart/page.tsx
      checkout/
        page.tsx
        success/page.tsx
    (auth)/
      login/page.tsx
      register/page.tsx
      designer-register/page.tsx  # "become a designer" — creates DesignerProfile for the current or a new user
    account/
      layout.tsx                  # session-gated
      page.tsx                    # dashboard
      purchases/page.tsx
      downloads/page.tsx
      favorites/page.tsx
      collections/[id]/page.tsx
      profile/page.tsx
      billing/page.tsx
    seller/
      layout.tsx                  # DESIGNER-gated
      dashboard/page.tsx
      fonts/page.tsx
      fonts/new/page.tsx           # multi-step upload wizard
      fonts/[id]/edit/page.tsx
      orders/page.tsx
      earnings/page.tsx
      settings/page.tsx
    admin/
      layout.tsx                   # ADMIN-gated
      page.tsx                     # dashboard
      fonts/page.tsx
      fonts/[id]/page.tsx           # review detail
      designers/page.tsx
      customers/page.tsx
      orders/page.tsx
      commission/page.tsx
      payouts/page.tsx
      categories/page.tsx
      tags/page.tsx
      licenses/page.tsx
      coupons/page.tsx
      settings/page.tsx
      audit-log/page.tsx
    api/                           # see API_CONTRACTS.md
    sitemap.ts
    robots.ts
    layout.tsx                     # root layout: fonts, providers, toaster
    globals.css
  components/
    ui/                             # shadcn primitives (button, input, card, dialog, sheet, tabs, slider, ...)
    marketing/                      # homepage sections, hero, footer, nav
    fonts/                          # FontCard, FontPreviewPanel, GlyphGrid, StyleSwitcher, TryBeforeYouBuy
    cart/
    checkout/
    account/
    seller/
    admin/
    shared/                         # EmptyState, ErrorState, Skeletons, Pagination
  server/
    models/                         # Mongoose schemas — one file per collection
    repositories/                   # only files that import models
    services/                       # business logic, framework-agnostic
      storage/                      # StorageService, FontFileService, DownloadService
      payment/                      # PaymentProvider, StripeProvider
      search/                       # SearchProvider, AtlasSearchProvider, LocalTextSearchProvider
      commission.service.ts
      font-publishing.service.ts
      order.service.ts
      auth.service.ts
    lib/
      db.ts                         # Mongoose connection singleton
      session.ts                    # getSession/requireRole/requireOwnership helpers
      rate-limit.ts
      audit.ts
  lib/
    utils.ts                        # cn() etc — client+server safe
    fonts.ts                        # client helpers: buildFontFaceCss(), preview text defaults
  types/
    enums.ts
    api.ts
    errors.ts
    schemas/                        # zod schemas, shared client/server
    *.ts                            # FontSummary, FontDetail, etc. — DTOs, not Mongoose docs
  hooks/                             # useFavorite(), useCart(), useDebouncedSearch()
  store/                             # zustand stores (preview panel UI state only)
scripts/
  seed.ts
  create-indexes.ts
  setup-atlas-search.ts
tests/
  unit/
  integration/
  e2e/
docs/
public/
  demo-fonts/                       # OFL-licensed sample fonts used by seed data
```

## Design system

- Typography-first visual language: the marketing layout loads a rotating set of
  **Google Fonts variable fonts** (Inter for UI chrome; Fraunces, Space Grotesk,
  JetBrains Mono, Caveat as "voice" fonts used in the hero and section headers) via
  `next/font/google`, so the platform's own chrome demonstrates good type choices.
  Marketplace/product fonts are loaded per-font via generated `@font-face` CSS
  pointed at each font's `PREVIEW` `FontFile` (see `lib/fonts.ts#buildFontFaceCss`).
- Color: near-black/near-white neutral base (no dark-mode toggle in V1 — deliberate
  scope cut, single light theme, accessible contrast throughout) with a single
  accent color used sparingly (CTAs, active states). No gradients, no glassmorphism,
  per spec §4.
- Components: shadcn/ui primitives only, customized via Tailwind — no separate
  component library.
- Motion: `tailwindcss-animate` utility classes for the handful of specified
  micro-interactions (favorite heart pulse, card hover lift, skeleton shimmer, toast
  slide-in). No animation libraries beyond that — spec explicitly warns against
  animation overload.

## Decisions made to keep this unblocked (documented, not asked about)

- **Approve vs. Publish**: `APPROVED` and `PUBLISHED` are kept as distinct statuses
  per spec §19. Admin "Approve" sets `APPROVED`; a font becomes visible in the
  storefront only at `PUBLISHED`. For designer-submitted fonts, approval requires a
  second explicit "Publish" action (by the designer or admin) so a designer can
  choose *when* an approved font goes live (e.g. coordinate a launch date). For
  `isPlatform` (My Fonts/Originals) fonts, admin approval auto-publishes
  immediately, since the platform owner is both submitter and approver.
- **Guest checkout**: allowed (spec doesn't forbid it, and "minimal friction" in
  §1 argues for it). Guest cart keyed by a signed httpOnly cookie `guestId`; guest
  orders capture `customerInfo.email` and downloads are gated by a magic-link style
  token emailed... **V1 simplification**: guest checkout downloads are available
  immediately on the success page (session-scoped) and via a "resend access" flow
  that emails the order's download links to `customerInfo.email`. Full account
  linking of a guest order on later signup is a documented V2 nicety, not built now.
- **Preview-safe font files**: true glyph-subsetting (stripping the file down to a
  handful of glyphs so the "preview" truly cannot be used as the deliverable) needs
  a font-processing pipeline (e.g. fonttools/pyftsubset) beyond V1 scope. V1's
  `PREVIEW` `FontFile` is the real file served through `next/font`'s local loader at
  render time only (never exposed as a downloadable link — no `<a href>`/download
  endpoint touches it) — good enough for "try before you buy" without a public
  attack surface, but not cryptographically un-extractable by a determined user
  inspecting network requests. Documented as a known V1 limitation; V2 Font Lab is a
  natural place to add real subsetting on export.
- **Currency**: USD only in V1 (`SiteSetting: currency.default`), multi-currency
  display is a documented future step — Stripe Checkout still handles real card
  processing correctly, this only affects displayed currency.
- **Payouts**: admin-marked-paid (spec §23 explicitly allows this for V1), behind a
  `PayoutProcessor` interface so Stripe Connect automation is an implementation swap
  later, not a rewrite.
- **Bundles**: the spec doesn't define a distinct data model for "Font Bundles" (it
  only appears as a merchandising section, §2/§26). Rather than add a parallel
  product type, a Bundle is simply a `Collection` with `isPublic: true` — the same
  model used for a customer's own "My Logo Fonts" folder (§34), just admin-owned and
  public. `CollectionRepository.listPublicBundles()` is the read path; pricing for a
  bundle purchase is out of scope for V1 (bundles are curated/discovery only —
  "buy" from a bundle takes you to the individual font's normal purchase flow).
  Revisit as a first-class priced product if bundle-level checkout is needed later.

## Environment variables — see `.env.example`

## Running locally

```bash
npm install
cp .env.example .env.local     # fill in MongoDB URI, Stripe test keys, storage creds
npm run db:indexes             # create Mongoose indexes
npm run seed                   # demo admin/designers/customers/fonts/orders
npm run dev
```

## Quality gates (run after every feature merge)

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
