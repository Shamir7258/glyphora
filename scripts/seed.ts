/**
 * Demo seed data: admin, designers (including the platform "Glyphora Originals"
 * account), customers, categories, tags, licenses, sample fonts (real OFL-licensed
 * files — see scripts/seed-assets/fonts/LICENSES.md, never copyrighted commercial
 * fonts per spec §46), a couple of public bundles, and a sample paid order so
 * seller earnings/admin dashboards have real data to show.
 *
 * Run with: npm run seed
 */
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import slugify from "slugify";
import mongoose from "mongoose";
import { connectDB } from "@/server/lib/db";
import { UserModel } from "@/server/models/user.model";
import { DesignerProfileModel } from "@/server/models/designer-profile.model";
import { CategoryModel } from "@/server/models/category.model";
import { TagModel } from "@/server/models/tag.model";
import { FontLicenseModel } from "@/server/models/font-license.model";
import { FontModel } from "@/server/models/font.model";
import { FontVariantModel } from "@/server/models/font-variant.model";
import { FontFileModel } from "@/server/models/font-file.model";
import { CollectionModel } from "@/server/models/collection.model";
import { OrderModel } from "@/server/models/order.model";
import { OrderItemModel } from "@/server/models/order-item.model";
import { PaymentModel } from "@/server/models/payment.model";
import { TransactionModel } from "@/server/models/transaction.model";
import { CommissionConfigModel } from "@/server/models/commission-config.model";
import { SiteSettingModel } from "@/server/models/site-setting.model";
import { ReviewModel } from "@/server/models/review.model";
import { writeLocalObject } from "@/server/services/storage/local-provider";
import { validateFontFile } from "@/server/services/storage/font-file.service";
import { CommissionService } from "@/server/services/commission.service";

const envLocalPath = path.join(process.cwd(), ".env.local");
loadEnv({ path: existsSync(envLocalPath) ? envLocalPath : path.join(process.cwd(), ".env") });

const FONTS_DIR = path.join(process.cwd(), "scripts", "seed-assets", "fonts");
const SEED_PASSWORD = "Passw0rd123!";

type SeedFontSpec = {
  file: string;
  name: string;
  designer: "platform" | "amara" | "kenji" | "sofia";
  category: string;
  tags: string[];
  price: number; // dollars
  productType: "ORIGINAL" | "MARKETPLACE";
  previewText: string;
  description: string;
};

const CATEGORIES = [
  "Serif", "Sans Serif", "Display", "Script", "Handwritten", "Monospace",
  "Retro", "Vintage", "Luxury", "Minimal", "Gaming", "Kids", "Wedding",
  "Restaurant", "Fashion", "Logo", "Experimental",
];

const MOOD_TAGS = [
  "Elegant", "Bold", "Modern", "Friendly", "Luxury", "Playful", "Professional",
  "Futuristic", "Vintage", "Handmade", "Geometric", "Minimal", "Experimental",
];

const LICENSES = [
  {
    key: "PERSONAL",
    name: "Personal",
    description: "For personal, non-commercial projects only.",
    priceMultiplier: 1,
    allowedUsage: ["Personal projects", "Non-commercial social media"],
    restrictions: ["No commercial use", "No resale or redistribution"],
    sortOrder: 1,
  },
  {
    key: "COMMERCIAL",
    name: "Commercial",
    description: "For commercial projects with up to 500,000 units/impressions.",
    priceMultiplier: 2.5,
    allowedUsage: ["Client work", "Products for sale", "Marketing materials", "Apps and websites"],
    restrictions: ["Up to 500,000 units or impressions", "No redistribution of the font file itself"],
    sortOrder: 2,
  },
  {
    key: "EXTENDED",
    name: "Extended",
    description: "For unlimited commercial use, including merchandise for resale.",
    priceMultiplier: 5,
    allowedUsage: ["Unlimited commercial use", "Merchandise for resale", "Logos and trademarks"],
    restrictions: ["No redistribution of the font file itself"],
    sortOrder: 3,
  },
];

const FONT_SPECS: SeedFontSpec[] = [
  {
    file: "playfair-display.ttf", name: "Playfair Display Original", designer: "platform",
    category: "Serif", tags: ["Elegant", "Luxury"], price: 39, productType: "ORIGINAL",
    previewText: "Editorial Elegance", description: "A high-contrast display serif built for editorial headlines and luxury branding.",
  },
  {
    file: "dm-serif-display.ttf", name: "DM Serif Original", designer: "platform",
    category: "Luxury", tags: ["Elegant", "Professional"], price: 45, productType: "ORIGINAL",
    previewText: "Timeless & Refined", description: "A refined serif with generous curves, designed as a Glyphora Originals flagship.",
  },
  {
    file: "archivo-black.ttf", name: "Archivo Bold Original", designer: "platform",
    category: "Display", tags: ["Bold", "Modern"], price: 29, productType: "ORIGINAL",
    previewText: "MAKE IT LOUD", description: "A confident, ultra-bold display face for headlines that need to be seen.",
  },
  {
    file: "space-grotesk.ttf", name: "Grotesk Futura", designer: "amara",
    category: "Sans Serif", tags: ["Modern", "Geometric", "Futuristic"], price: 24, productType: "MARKETPLACE",
    previewText: "Design Systems", description: "A geometric grotesk with a technical edge, great for product and SaaS branding.",
  },
  {
    file: "cormorant-garamond.ttf", name: "Cormorant Luxe", designer: "sofia",
    category: "Wedding", tags: ["Elegant", "Luxury", "Vintage"], price: 32, productType: "MARKETPLACE",
    previewText: "Forever & Always", description: "A delicate, high-contrast serif perfect for wedding invitations and luxury stationery.",
  },
  {
    file: "caveat.ttf", name: "Caveat Handwritten", designer: "sofia",
    category: "Handwritten", tags: ["Friendly", "Handmade", "Playful"], price: 18, productType: "MARKETPLACE",
    previewText: "Notes from the heart", description: "A warm, natural handwriting font for personal and friendly brand voices.",
  },
  {
    file: "space-mono.ttf", name: "Mono Terminal", designer: "kenji",
    category: "Monospace", tags: ["Geometric", "Minimal", "Futuristic"], price: 22, productType: "MARKETPLACE",
    previewText: "console.log('hello')", description: "A clean monospace built for code, terminals, and technical documentation.",
  },
  {
    file: "bitter.ttf", name: "Bitter Editorial", designer: "kenji",
    category: "Serif", tags: ["Professional", "Modern"], price: 26, productType: "MARKETPLACE",
    previewText: "The Daily Read", description: "A sturdy slab-leaning serif designed for long-form reading on screen.",
  },
];

const DESIGNERS = {
  amara: { username: "amara-types", displayName: "Amara Studio", bio: "Type design studio focused on geometric, tech-forward typefaces." },
  kenji: { username: "kenji-ito", displayName: "Kenji Ito", bio: "Independent type designer specializing in editorial and code typefaces." },
  sofia: { username: "sofia-marin", displayName: "Sofia Marin", bio: "Hand-lettering artist turned type designer, focused on wedding & lifestyle brands." },
};

async function upsertUser(email: string, name: string, roles: string[]) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  return UserModel.findOneAndUpdate(
    { email },
    { $setOnInsert: { email, name, passwordHash, roles } },
    { upsert: true, new: true }
  );
}

async function seedFontFile(buffer: Buffer, filename: string) {
  const validation = await validateFontFile(buffer, "TTF");
  if (!validation.valid) throw new Error(`Seed font ${filename} failed validation: ${validation.reason}`);

  const previewKey = `seed/${filename}`;
  await writeLocalObject("previews", previewKey, buffer);
  const deliverableKey = `seed/${filename}`;
  await writeLocalObject("deliverables", deliverableKey, buffer);

  return { validation, previewKey, deliverableKey };
}

async function main() {
  await connectDB();
  console.log("Connected to MongoDB. Seeding…");

  // ── Users & designers ────────────────────────────────────────────
  const adminUser = await upsertUser("admin@glyphora.app", "Glyphora Admin", ["CUSTOMER", "ADMIN", "SUPER_ADMIN"]);
  const platformUser = await upsertUser("originals@glyphora.app", "Glyphora Studio", ["CUSTOMER", "DESIGNER"]);
  const customer1 = await upsertUser("jordan@example.com", "Jordan Lee", ["CUSTOMER"]);
  const customer2 = await upsertUser("priya@example.com", "Priya Nair", ["CUSTOMER"]);

  const platformDesigner = await DesignerProfileModel.findOneAndUpdate(
    { username: "glyphora-originals" },
    {
      $setOnInsert: {
        user: platformUser._id,
        username: "glyphora-originals",
        displayName: "Glyphora Originals",
        bio: "In-house type foundry — designed and published directly by the Glyphora team.",
        isPlatform: true,
      },
    },
    { upsert: true, new: true }
  );

  const designerProfiles: Record<string, InstanceType<typeof DesignerProfileModel>> = {};
  for (const [key, info] of Object.entries(DESIGNERS)) {
    const user = await upsertUser(`${key}@example.com`, info.displayName, ["CUSTOMER", "DESIGNER"]);
    designerProfiles[key] = await DesignerProfileModel.findOneAndUpdate(
      { username: info.username },
      { $setOnInsert: { user: user._id, username: info.username, displayName: info.displayName, bio: info.bio } },
      { upsert: true, new: true }
    );
  }

  // ── Categories & tags ────────────────────────────────────────────
  const categoryDocs = new Map<string, InstanceType<typeof CategoryModel>>();
  for (let i = 0; i < CATEGORIES.length; i++) {
    const name = CATEGORIES[i];
    const slug = slugify(name, { lower: true, strict: true });
    const doc = await CategoryModel.findOneAndUpdate(
      { slug },
      { $setOnInsert: { name, slug, sortOrder: i, isActive: true } },
      { upsert: true, new: true }
    );
    categoryDocs.set(name, doc);
  }

  const tagDocs = new Map<string, InstanceType<typeof TagModel>>();
  for (const name of MOOD_TAGS) {
    const slug = slugify(name, { lower: true, strict: true });
    const doc = await TagModel.findOneAndUpdate(
      { slug },
      { $setOnInsert: { name, slug, kind: "MOOD" } },
      { upsert: true, new: true }
    );
    tagDocs.set(name, doc);
  }

  // ── Licenses ─────────────────────────────────────────────────────
  const licenseDocs = new Map<string, InstanceType<typeof FontLicenseModel>>();
  for (const license of LICENSES) {
    const doc = await FontLicenseModel.findOneAndUpdate(
      { key: license.key },
      { $setOnInsert: license },
      { upsert: true, new: true }
    );
    licenseDocs.set(license.key, doc);
  }

  // ── Commission config + site settings ───────────────────────────
  const existingCommission = await CommissionConfigModel.findOne();
  if (!existingCommission) {
    await CommissionService.createConfig(
      Number(process.env.DEFAULT_COMMISSION_PERCENTAGE ?? 30),
      adminUser._id.toString(),
      "Initial marketplace commission"
    );
  }

  const defaultSettings: [string, unknown, string][] = [
    ["currency.default", "USD", "Default display currency"],
    ["download.linkExpirySeconds", 300, "Signed download URL lifetime"],
    ["download.maxPerLicense", 5, "Max re-downloads per purchased license"],
    ["payout.minimumAmountCents", 5000, "Minimum payout request amount"],
  ];
  for (const [key, value, description] of defaultSettings) {
    await SiteSettingModel.findOneAndUpdate(
      { key },
      { $setOnInsert: { key, value, description, updatedBy: adminUser._id } },
      { upsert: true }
    );
  }

  // ── Fonts ────────────────────────────────────────────────────────
  const createdFonts: InstanceType<typeof FontModel>[] = [];
  for (const spec of FONT_SPECS) {
    const existing = await FontModel.findOne({ name: spec.name });
    if (existing) {
      // The DB (shared across parallel worktrees) may already have this Font
      // doc, but the actual font file bytes live on THIS machine's local disk
      // under a deterministic `seed/<filename>` key — a fresh worktree won't
      // have them yet. Always (re)write the local files so every worktree can
      // actually render/download the demo fonts, without touching Mongo again.
      const buffer = await readFile(path.join(FONTS_DIR, spec.file));
      await seedFontFile(buffer, spec.file);
      createdFonts.push(existing);
      continue;
    }

    const buffer = await readFile(path.join(FONTS_DIR, spec.file));
    const { validation, previewKey, deliverableKey } = await seedFontFile(buffer, spec.file);
    if (!validation.valid) continue;

    const designer = spec.designer === "platform" ? platformDesigner : designerProfiles[spec.designer];
    const category = categoryDocs.get(spec.category)!;
    const tags = spec.tags.map((t) => tagDocs.get(t)!._id);

    const slug = `${slugify(spec.name, { lower: true, strict: true })}`;
    const font = await FontModel.create({
      slug,
      name: spec.name,
      designer: designer._id,
      productType: spec.productType,
      creationSource: "MARKETPLACE_UPLOAD",
      description: spec.description,
      category: category._id,
      tags,
      languages: ["English", "Latin"],
      glyphCount: validation.glyphCount,
      basePriceCents: Math.round(spec.price * 100),
      currency: "USD",
      previewText: spec.previewText,
      status: "PUBLISHED",
      publishedAt: new Date(),
      reviewedBy: adminUser._id,
      reviewedAt: new Date(),
      designerName: designer.displayName,
      categoryName: category.name,
      tagNames: spec.tags,
      seo: { title: `${spec.name} — Glyphora`, description: spec.description.slice(0, 155) },
    });

    const previewFile = await FontFileModel.create({
      font: font._id,
      purpose: "PREVIEW",
      format: "TTF",
      storageKey: previewKey,
      fileSizeBytes: validation.fileSizeBytes,
      checksumSha256: validation.checksumSha256,
      originalFilename: spec.file,
      uploadedBy: adminUser._id,
      validated: true,
    });

    await FontFileModel.create({
      font: font._id,
      purpose: "DELIVERABLE",
      format: "TTF",
      storageKey: deliverableKey,
      fileSizeBytes: validation.fileSizeBytes,
      checksumSha256: validation.checksumSha256,
      originalFilename: spec.file,
      uploadedBy: adminUser._id,
      validated: true,
    });

    await FontVariantModel.create({
      font: font._id,
      name: "Regular",
      weight: 400,
      style: "normal",
      isDefault: true,
      previewFontFile: previewFile._id,
    });

    await DesignerProfileModel.findByIdAndUpdate(designer._id, { $inc: { "stats.totalProducts": 1 } });

    createdFonts.push(font);
    console.log(`  ✓ Font: ${spec.name} (${spec.productType})`);
  }

  // ── Bundles (public Collections) ────────────────────────────────
  const bundleSpecs = [
    { name: "Wedding Invitation Set", description: "Elegant serif + script pairing for wedding stationery.", fontNames: ["Cormorant Luxe", "Caveat Handwritten"] },
    { name: "Startup Brand Kit", description: "Modern geometric sans + mono for product and dev-facing brands.", fontNames: ["Grotesk Futura", "Mono Terminal"] },
  ];
  for (const bundle of bundleSpecs) {
    const fonts = createdFonts.filter((f) => bundle.fontNames.includes(f.name));
    await CollectionModel.findOneAndUpdate(
      { name: bundle.name, isPublic: true },
      {
        $setOnInsert: {
          user: adminUser._id,
          name: bundle.name,
          description: bundle.description,
          isPublic: true,
          fonts: fonts.map((f) => f._id),
        },
      },
      { upsert: true }
    );
  }

  // ── A sample paid order (so seller earnings / admin dashboards have data) ──
  const existingOrder = await OrderModel.findOne({ orderNumber: "GLY-SEED-0001" });
  if (!existingOrder) {
    const font = createdFonts.find((f) => f.name === "Grotesk Futura")!;
    const license = licenseDocs.get("COMMERCIAL")!;
    const unitPriceCents = Math.round(font.basePriceCents * license.priceMultiplier);

    const order = await OrderModel.create({
      orderNumber: "GLY-SEED-0001",
      user: customer1._id,
      customerInfo: { name: customer1.name, email: customer1.email },
      items: [],
      subtotalCents: unitPriceCents,
      grandTotalCents: unitPriceCents,
      currency: "USD",
      status: "PAID",
    });

    const percentage = await CommissionService.getEffectivePercentage();
    const split = CommissionService.splitAmount(unitPriceCents, percentage);

    const orderItem = await OrderItemModel.create({
      order: order._id,
      font: font._id,
      license: license._id,
      designer: font.designer,
      unitPriceCents,
      quantity: 1,
      lineTotalCents: unitPriceCents,
      commissionPercentageAtSale: split.percentage,
      designerShareCents: split.designerShareCents,
      platformFeeCents: split.platformFeeCents,
      downloadGranted: true,
    });

    order.items = [orderItem._id] as unknown as typeof order.items;
    await order.save();

    await PaymentModel.create({
      order: order._id,
      providerSessionId: "seed_session_0001",
      providerPaymentId: "seed_payment_0001",
      status: "SUCCEEDED",
      amountCents: unitPriceCents,
      currency: "USD",
    });

    await TransactionModel.create({
      type: "SALE",
      order: order._id,
      orderItem: orderItem._id,
      designer: font.designer,
      grossAmountCents: unitPriceCents,
      platformFeeCents: split.platformFeeCents,
      designerShareCents: split.designerShareCents,
      netAmountCents: split.designerShareCents,
      commissionPercentageUsed: split.percentage,
      currency: "USD",
    });

    await FontModel.findByIdAndUpdate(font._id, { $inc: { salesCount: 1 } });
    await DesignerProfileModel.findByIdAndUpdate(font.designer, {
      $inc: { "stats.totalSalesCount": 1, "stats.totalRevenueCents": split.designerShareCents },
    });

    await ReviewModel.create({
      font: font._id,
      user: customer1._id,
      order: order._id,
      rating: 5,
      comment: "Beautiful, technical, exactly what our product docs needed.",
    });

    console.log("  ✓ Sample paid order + earnings + review");
  }

  console.log("\nSeed complete.");
  console.log("  Admin login:      admin@glyphora.app / " + SEED_PASSWORD);
  console.log("  Designer login:   amara@example.com / " + SEED_PASSWORD);
  console.log("  Customer login:   jordan@example.com / " + SEED_PASSWORD);
}

main()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error(err);
    return mongoose.disconnect().finally(() => process.exit(1));
  });
