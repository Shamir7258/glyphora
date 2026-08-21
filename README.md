# Glyphora

A premium font marketplace — sell your own fonts, let independent designers
publish and sell theirs, take a configurable commission, and give customers an
instant, interactive way to preview and buy type.

This is **Version 1**. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the
full system design, [`docs/DATABASE.md`](docs/DATABASE.md) for the data model, and
[`docs/API_CONTRACTS.md`](docs/API_CONTRACTS.md) for every route. Those three
documents are the source of truth — this README is the "get it running" guide.

## Stack

Next.js 16 (App Router, TypeScript, Tailwind v4, shadcn/ui) · MongoDB + Mongoose ·
Auth.js (credentials now, OAuth-ready) · Stripe (payment abstraction, Razorpay-ready)
· S3-compatible storage (local-disk in dev, AWS S3/Cloudflare R2 in production) ·
MongoDB Atlas Search (with a local-text-index fallback for non-Atlas dev/deploys).

## Quick start (zero external accounts required)

```bash
npm install
cp .env.example .env.local
# Generate a session secret and paste it into NEXTAUTH_SECRET in .env.local:
openssl rand -base64 32

# Local MongoDB — either:
#   a) have `mongod` running locally on 27017, matching the default MONGODB_URI, or
#   b) point MONGODB_URI at a MongoDB Atlas connection string.

npm run db:indexes   # build all indexes
npm run seed         # demo admin / designers / customers / fonts / a paid order
npm run dev          # http://localhost:3000
```

That's genuinely everything for local development — `STORAGE_PROVIDER=local` and
`SEARCH_PROVIDER=local` (both defaults) mean no AWS/Atlas/Stripe account is needed
to browse fonts, preview them live, register, and explore the seller/admin UIs.
Checkout requires a Stripe key (below) since there's no local stand-in for real
payment processing.

### Demo accounts (created by `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@glyphora.app` | `Passw0rd123!` |
| Designer | `amara@example.com` (also `kenji@…`, `sofia@…`) | `Passw0rd123!` |
| Customer | `jordan@example.com` (also `priya@…`) | `Passw0rd123!` |

Seeded fonts use real [OFL-licensed](https://openfontlicense.org) files from Google
Fonts as demo/sample data — see
[`scripts/seed-assets/fonts/LICENSES.md`](scripts/seed-assets/fonts/LICENSES.md).
No copyrighted commercial fonts are used anywhere in this repo.

## Environment setup

All variables are documented inline in [`.env.example`](.env.example). The ones
that matter for each concern:

- **MongoDB**: `MONGODB_URI`. Local `mongod` works for everything except Atlas
  Search (see below).
- **Auth**: `NEXTAUTH_SECRET` (required), `NEXTAUTH_URL`. OAuth is architecture-
  ready — set `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` to enable Google sign-in
  with zero code changes (`src/server/lib/auth.ts`).
- **Storage**: `STORAGE_PROVIDER=local` (default, no setup) or `s3` (set
  `STORAGE_ENDPOINT` for Cloudflare R2, leave blank for real AWS S3, plus
  `STORAGE_ACCESS_KEY_ID`/`STORAGE_SECRET_ACCESS_KEY`/bucket names).
- **Payments**: `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY`/`STRIPE_WEBHOOK_SECRET`
  — get test-mode keys from the Stripe dashboard. Without these, checkout session
  creation throws a clear error rather than failing silently.
- **Search**: `SEARCH_PROVIDER=local` (default, MongoDB text index — works with
  plain `mongod`) or `atlas` (requires a MongoDB **Atlas** cluster — Atlas Search
  is not available on self-hosted MongoDB at all).

### Atlas Search setup (optional — only if `SEARCH_PROVIDER=atlas`)

1. Point `MONGODB_URI` at an Atlas cluster.
2. `npm run search:setup` — creates/updates the `fonts_search` index (definition in
   `docs/DATABASE.md`). Atlas Search indexes build asynchronously; check the Atlas
   UI for "Active" status before relying on it.
3. Set `SEARCH_PROVIDER=atlas`.

### Stripe webhook setup (for local checkout testing)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# paste the printed webhook signing secret into STRIPE_WEBHOOK_SECRET
```

## Development

```bash
npm run dev         # dev server (Turbopack)
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run test         # vitest (unit/integration)
npm run test:e2e     # playwright
npm run build        # production build
```

Run the full gate before considering a feature done:

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

## Production build & deployment

```bash
npm run build && npm start        # or:
docker build -t glyphora . && docker run -p 3000:3000 --env-file .env.production glyphora
```

`next.config.ts` uses `output: "standalone"` so the Docker image only ships the
files a running server actually needs. In production:

- Set `STORAGE_PROVIDER=s3` with real bucket credentials — the local-disk provider
  is a dev/demo convenience, not meant for a multi-instance deployment.
- Set `mongoose.set('autoIndex', false)` equivalent by not relying on Mongoose's
  dev-mode auto-index behavior — run `npm run db:indexes` as an explicit deploy
  step instead (see `docs/DATABASE.md`).
- Point `NEXTAUTH_URL`/`NEXT_PUBLIC_APP_URL` at the real deployed origin.

## Admin account setup

The seed script creates `admin@glyphora.app` with `ADMIN`+`SUPER_ADMIN` roles. To
promote a real account you registered yourself instead:

```js
// mongosh
db.users.updateOne({ email: "you@example.com" }, { $addToSet: { roles: { $each: ["ADMIN", "SUPER_ADMIN"] } } })
```

## Architecture overview

Everything server-side is layered `route handler → service → repository → model`
(see `docs/ARCHITECTURE.md` §4) so business logic is unit-testable without an HTTP
layer, and Mongoose is never imported outside `src/server/repositories`. Storage,
payments, and search are each a small interface with two implementations selected
by an env var — swap the local/dev implementation for the production one without
touching any calling code. Fonts carry a `creationSource` field so a future Font
Lab (V2) can publish directly into the same marketplace product model without a
rebuild — see `docs/ARCHITECTURE.md` §9.

## Project status

This is an actively-developed V1. See `docs/agent-reports/` for what each part of
the system covers and any known gaps as work lands.
