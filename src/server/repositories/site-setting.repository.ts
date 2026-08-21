import { connectDB } from "@/server/lib/db";
import { SiteSettingModel } from "@/server/models/site-setting.model";

export type SiteSettingDTO = {
  key: string;
  value: unknown;
  description: string;
  updatedAt: string | null;
};

/** Known keys, surfaced with sensible input types rather than a raw JSON textarea
 * (see task brief). Any other key found in the DB still renders, generically. */
export const KNOWN_SETTINGS: {
  key: string;
  label: string;
  type: "number" | "text" | "currency-code";
  help: string;
  defaultValue: unknown;
}[] = [
  {
    key: "currency.default",
    label: "Default currency",
    type: "currency-code",
    help: "3-letter ISO currency code used for display across the storefront (Stripe still processes real card charges regardless — see docs/DEVELOPMENT.md).",
    defaultValue: "USD",
  },
  {
    key: "download.linkExpirySeconds",
    label: "Download link expiry (seconds)",
    type: "number",
    help: "How long a signed deliverable download URL stays valid after it's minted.",
    defaultValue: 300,
  },
  {
    key: "download.maxPerLicense",
    label: "Max downloads per license",
    type: "number",
    help: "Maximum number of times a customer may re-download a purchased file.",
    defaultValue: 5,
  },
  {
    key: "payout.minimumAmountCents",
    label: "Minimum payout amount (cents)",
    type: "number",
    help: "Smallest balance a designer may request as a payout, in cents.",
    defaultValue: 5000,
  },
];

export const SiteSettingRepository = {
  async listAll(): Promise<SiteSettingDTO[]> {
    await connectDB();
    const docs = await SiteSettingModel.find().lean();
    const byKey = new Map(docs.map((d) => [d.key, d]));

    const known = KNOWN_SETTINGS.map((k) => {
      const doc = byKey.get(k.key);
      byKey.delete(k.key);
      return {
        key: k.key,
        value: doc ? doc.value : k.defaultValue,
        description: doc?.description || k.help,
        updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
      };
    });

    const unknown = Array.from(byKey.values()).map((d) => ({
      key: d.key,
      value: d.value,
      description: d.description,
      updatedAt: d.updatedAt ? d.updatedAt.toISOString() : null,
    }));

    return [...known, ...unknown];
  },

  async upsert(key: string, value: unknown, updatedBy: string, description?: string) {
    await connectDB();
    const before = await SiteSettingModel.findOne({ key }).lean();
    const after = await SiteSettingModel.findOneAndUpdate(
      { key },
      { $set: { value, updatedBy, ...(description ? { description } : {}) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return { before, after };
  },
};
