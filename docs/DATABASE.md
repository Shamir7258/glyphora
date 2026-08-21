# Glyphora — Database Design (Source of Truth)

MongoDB via Mongoose. Models live in `src/server/models/*.model.ts`, one file per
collection, default-exported as the compiled Mongoose model. **Only repositories
(`src/server/repositories/*`) import these directly.**

Money is always stored as an **integer in the smallest currency unit** (cents), field
suffix `...Cents`. Never store floats for money.

## Enums (`src/types/enums.ts` — shared between client and server)

```ts
export const ROLES = ['CUSTOMER', 'DESIGNER', 'ADMIN', 'SUPER_ADMIN'] as const
export const FONT_STATUS = [
  'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED',
  'REJECTED', 'SUSPENDED', 'ARCHIVED',
] as const
export const FONT_FORMAT = ['OTF', 'TTF', 'WOFF', 'WOFF2'] as const
export const FONT_FILE_PURPOSE = ['PREVIEW', 'DELIVERABLE'] as const
export const PRODUCT_TYPE = ['ORIGINAL', 'MARKETPLACE'] as const
export const CREATION_SOURCE = ['MARKETPLACE_UPLOAD', 'INTERNAL_FONT_LAB'] as const
export const ORDER_STATUS = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'] as const
export const PAYMENT_STATUS = ['REQUIRES_PAYMENT', 'SUCCEEDED', 'FAILED', 'REFUNDED'] as const
export const PAYOUT_STATUS = ['REQUESTED', 'PROCESSING', 'PAID', 'REJECTED'] as const
export const TRANSACTION_TYPE = ['SALE', 'REFUND', 'PAYOUT'] as const
export const COUPON_TYPE = ['PERCENTAGE', 'FIXED'] as const
export const ANALYTICS_EVENT_TYPE = [
  'FONT_VIEW', 'FONT_PREVIEW', 'SEARCH', 'FAVORITE',
  'ADD_TO_CART', 'PURCHASE', 'DOWNLOAD',
] as const
```

## Collections

### User
```
email          string, unique, lowercase, indexed
passwordHash   string | null            // null when OAuth-only
name           string
avatarUrl      string | null
roles          Role[]                    // default ['CUSTOMER']
emailVerifiedAt Date | null
status         'ACTIVE' | 'SUSPENDED'
createdAt/updatedAt
```
Index: `{ email: 1 }` unique.

### Account (Auth.js OAuth linkage — standard Auth.js Mongoose adapter shape)
`userId, provider, providerAccountId, type, access_token, refresh_token, expires_at, ...`
Index: `{ provider: 1, providerAccountId: 1 }` unique.

### DesignerProfile
```
user            ObjectId -> User, unique
username        string, unique, indexed        // slug, e.g. "jane-type"
displayName     string
bio             string
avatarUrl       string | null
coverImageUrl   string | null
website         string | null
socialLinks     { twitter?, instagram?, behance?, dribbble? }
isPlatform      boolean, default false          // true = the "My Fonts" / Originals owner
payoutMethod    string | null                   // abstracted; e.g. "MANUAL_BANK_TRANSFER"
payoutDetails   Mixed                            // opaque, admin-entered in V1
stats           { totalProducts, totalSalesCount, totalRevenueCents }  // denormalized
status          'ACTIVE' | 'SUSPENDED'
createdAt/updatedAt
```
Indexes: `{ username: 1 }` unique, `{ user: 1 }` unique.

### Category
```
name, slug (unique), description, icon, sortOrder, isActive
```

### Tag
```
name, slug (unique), kind: 'CATEGORY_STYLE' | 'MOOD'   // one collection, two use-cases (style tags vs mood/descriptor tags from spec §28)
```

### FontLicense  (admin-configurable license *templates*, spec §12)
```
key             string, unique   // "PERSONAL", "COMMERCIAL", "EXTENDED", or custom
name, description
priceMultiplier number           // e.g. 1, 2.5, 5 — multiplies Font.basePriceCents
allowedUsage    string[]
restrictions    string[]
isActive, sortOrder
```
Rule: license *rules* (usage/restrictions/pricing) never get hardcoded in
components — always read from this collection.

### Font
```
slug            string, unique, indexed (SEO url)
name            string
designer        ObjectId -> DesignerProfile, indexed
productType     'ORIGINAL' | 'MARKETPLACE'
creationSource  'MARKETPLACE_UPLOAD' | 'INTERNAL_FONT_LAB', default MARKETPLACE_UPLOAD
description     string
category        ObjectId -> Category, indexed
tags            ObjectId[] -> Tag
languages       string[]              // e.g. ["Latin", "Cyrillic"]
glyphCount      number
basePriceCents  number
currency        string, default "USD"
previewText     string, default "Type something"
previewImageUrl string | null
openTypeFeatures [{ key, name, description, sampleText }]
status          FontStatus, indexed
rejectionReason string | null
reviewedBy      ObjectId -> User | null
reviewedAt      Date | null
publishedAt     Date | null, indexed
salesCount, viewCount, favoriteCount   number, default 0   // denormalized counters
seo             { title, description, ogImage }
createdAt/updatedAt
```
Indexes: `{ slug: 1 }` unique · `{ status: 1, publishedAt: -1 }` · `{ designer: 1 }` ·
`{ category: 1 }` · `{ productType: 1, status: 1 }` · text index on
`{ name, description }` as the local-search fallback · Atlas Search index
`fonts_search` (see below).

### FontVariant
```
font            ObjectId -> Font, indexed
name            string   // "Bold", "Regular Italic"
weight          number   // 100-900
style           'normal' | 'italic'
isDefault       boolean
```
Index: `{ font: 1 }`.

### FontFile
```
font            ObjectId -> Font, indexed
variant         ObjectId -> FontVariant | null
purpose         'PREVIEW' | 'DELIVERABLE'
format          FontFormat
storageKey      string     // bucket key, never a public URL for purpose=DELIVERABLE
fileSizeBytes   number
checksumSha256  string
originalFilename string
uploadedBy      ObjectId -> User
validated       boolean, default false
validationNotes string | null
createdAt
```
Index: `{ font: 1, purpose: 1 }`.

### Collection (user favorite folders — named "Collection" per spec §34; not to be
confused with a MongoDB collection, unfortunate naming overlap kept because the spec
uses this term)
```
user, name, description, isPublic, fonts: ObjectId[] -> Font
```
Index: `{ user: 1 }`.

### Favorite
```
user, font, collection (ObjectId -> Collection | null = default bucket)
```
Index: `{ user: 1, font: 1, collection: 1 }` unique.

### Cart
```
owner: { user: ObjectId | null, guestId: string | null }   // exactly one is set
items: [{ font, license: ObjectId -> FontLicense, variant: ObjectId | null,
          unitPriceCents, addedAt }]
updatedAt
```
Index: `{ 'owner.user': 1 }` unique sparse · `{ 'owner.guestId': 1 }` unique sparse.

### Order
```
orderNumber     string, unique   // e.g. "GLY-20260821-0001"
user            ObjectId -> User | null
customerInfo    { name, email }
items           ObjectId[] -> OrderItem
subtotalCents, discountCents, taxCents, processingFeeCents, grandTotalCents
currency
coupon          ObjectId -> Coupon | null
status          OrderStatus, indexed
payment         ObjectId -> Payment | null
createdAt/updatedAt
```
Index: `{ orderNumber: 1 }` unique · `{ user: 1, createdAt: -1 }`.

### OrderItem
```
order, font, variant (nullable), license
designer            ObjectId -> DesignerProfile   // denormalized for earnings queries
unitPriceCents, quantity, lineTotalCents
commissionPercentageAtSale  number    // SNAPSHOT — see CommissionConfig
designerShareCents, platformFeeCents  // computed once, at payment success, stored forever
downloadGranted     boolean, default false
```
Index: `{ order: 1 }` · `{ designer: 1, createdAt: -1 }`.

### Payment
```
order               ObjectId -> Order
provider            'STRIPE'
providerSessionId   string, unique
providerPaymentId   string | null, unique sparse
status              PaymentStatus
amountCents, currency
webhookEventLog     [{ eventId, type, receivedAt }]   // idempotency audit trail
createdAt/updatedAt
```
Index: `{ providerSessionId: 1 }` unique · `{ providerPaymentId: 1 }` unique sparse
(the sparse+unique pair is what makes webhook replays a no-op).

### CommissionConfig  (spec §22 — versioned, never mutated in place)
```
percentage      number   // 0-100
effectiveFrom   Date, indexed
createdBy       ObjectId -> User
note            string | null
```
"Current commission" = the doc with the greatest `effectiveFrom <= now()`. Resolved
by `CommissionService.getEffective(at: Date = now)`.

### Transaction  (immutable ledger row, one per OrderItem at payment success, plus
refund/payout rows)
```
type                'SALE' | 'REFUND' | 'PAYOUT'
order, orderItem    ObjectId | null
designer            ObjectId -> DesignerProfile | null
grossAmountCents, platformFeeCents, designerShareCents, taxCents, processingFeeCents, netAmountCents
commissionPercentageUsed  number
currency
payout              ObjectId -> Payout | null   // set once a SALE transaction is included in a payout
createdAt
```
Index: `{ designer: 1, createdAt: -1 }` · `{ order: 1 }`.

### Payout
```
designer, amountCents, currency
status              PayoutStatus
method, destinationDetails   Mixed
requestedAt, processedAt, processedBy: ObjectId -> User | null
notes
transactions        ObjectId[] -> Transaction
```
Index: `{ designer: 1, status: 1 }`.

### Download
```
user, order, orderItem, font, fontFile
ipAddress, userAgent
downloadedAt
```
Index: `{ user: 1, downloadedAt: -1 }` · `{ orderItem: 1 }`.

### Coupon
```
code (unique, uppercase), type: CouponType, value
appliesTo: 'ALL' | 'CATEGORY' | 'FONT' | 'DESIGNER'
appliesToRef        ObjectId | null
minSubtotalCents, maxRedemptions, redemptionCount, expiresAt, isActive
```

### Review
```
font, user, order   // order = proof of purchase, required
rating (1-5), comment
status: 'PUBLISHED' | 'HIDDEN'
```
Index: `{ font: 1, status: 1 }` · `{ font: 1, user: 1 }` unique (one review per
purchase-font pair).

### SiteSetting  (singleton key/value config, admin-editable, spec §37)
```
key (unique), value: Mixed, description, updatedBy, updatedAt
```
Known keys: `currency.default`, `download.linkExpirySeconds` (default 300),
`download.maxPerLicense`, `payout.minimumAmountCents`, `homepage.sections` (ordered
array of section keys — drives §26 homepage composition), `homepage.featuredFontIds`.

### AuditLog
```
actor: ObjectId -> User | null, action: string, entityType, entityId
before: Mixed | null, after: Mixed | null, ip, createdAt
```
Index: `{ entityType: 1, entityId: 1, createdAt: -1 }`.

### AnalyticsEvent  (spec §33)
```
type: AnalyticsEventType, user: ObjectId | null, font: ObjectId | null
query: string | null, metadata: Mixed, createdAt
```
TTL index: `{ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 }` (180 days —
raw events age out; V2 can roll them up before they expire).

## Atlas Search index definition (`fonts_search`, applied via `scripts/setup-atlas-search.ts`)

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": {
        "type": "string",
        "analyzer": "lucene.standard",
        "multi": { "autocomplete": { "type": "autocomplete" } }
      },
      "description": { "type": "string" },
      "designerName": { "type": "string" },
      "categoryName": { "type": "string" },
      "tagNames": { "type": "string" },
      "status": { "type": "token" },
      "basePriceCents": { "type": "number" },
      "publishedAt": { "type": "date" }
    }
  }
}
```
`designerName`/`categoryName`/`tagNames` are denormalized string fields written
alongside the Font doc (kept in sync by the repository's save path) specifically so
Atlas Search can query them without a `$lookup` inside `$search`. Fuzzy matching uses
`fuzzy: { maxEdits: 1, prefixLength: 2 }` on the `name`/`tagNames` clauses — this is
what gives "luxury" → luxury/elegant/premium-tagged results (tag matching), and typo
tolerance on font names.

## Query patterns these indexes exist for

- Font discovery grid: `{ status: 'PUBLISHED' }` sorted by `publishedAt desc` or
  `salesCount desc`, filtered by category/tags/price range → composite index
  `{ status, publishedAt }` plus `{ category, status }`.
- Designer earnings: `Transaction.find({ designer, type: 'SALE' })` → index above.
- "My purchases": `Order.find({ user, status: 'PAID' })` → `{ user, createdAt }`.
- Download authorization: `OrderItem.findOne({ order, font })` plus
  `Order.status === 'PAID'` check — no extra index needed beyond `order` FK, dataset
  per order is tiny.
