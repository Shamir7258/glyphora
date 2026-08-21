import { connectDB } from "@/server/lib/db";
import { CommissionConfigModel } from "@/server/models/commission-config.model";

const DEFAULT_PERCENTAGE = Number(process.env.DEFAULT_COMMISSION_PERCENTAGE ?? 30);

export type CommissionSplit = {
  percentage: number;
  designerShareCents: number;
  platformFeeCents: number;
};

/**
 * Commission is versioned (see docs/DATABASE.md — CommissionConfig is append-only).
 * "Effective" always means "the most recent config with effectiveFrom <= at" so
 * historical orders can be recomputed with the rate that actually applied at sale
 * time, never the live/current rate (spec §22).
 */
export const CommissionService = {
  async getEffectivePercentage(at: Date = new Date()): Promise<number> {
    await connectDB();
    const config = await CommissionConfigModel.findOne({ effectiveFrom: { $lte: at } })
      .sort({ effectiveFrom: -1 })
      .lean();
    return config?.percentage ?? DEFAULT_PERCENTAGE;
  },

  /** Splits a gross sale amount using the commission rate effective right now — call this once, at payment success, and store the result forever on the OrderItem/Transaction. */
  splitAmount(grossAmountCents: number, percentage: number): CommissionSplit {
    const platformFeeCents = Math.round((grossAmountCents * percentage) / 100);
    const designerShareCents = grossAmountCents - platformFeeCents;
    return { percentage, designerShareCents, platformFeeCents };
  },

  async createConfig(percentage: number, createdBy: string, note?: string) {
    await connectDB();
    if (percentage < 0 || percentage > 100) throw new Error("Commission percentage must be between 0 and 100.");
    return CommissionConfigModel.create({ percentage, createdBy, note, effectiveFrom: new Date() });
  },

  async history(limit = 20) {
    await connectDB();
    return CommissionConfigModel.find().sort({ effectiveFrom: -1 }).limit(limit).lean();
  },
};
