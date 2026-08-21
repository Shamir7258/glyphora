import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

// Versioned, append-only. "Current" commission = the row with the greatest
// effectiveFrom <= now. Never mutate an existing row — see CommissionService.
const commissionConfigSchema = new Schema(
  {
    percentage: { type: Number, required: true, min: 0, max: 100 },
    effectiveFrom: { type: Date, required: true, default: Date.now, index: true },
    createdBy: { type: Types.ObjectId, ref: "User", required: true },
    note: { type: String, default: null },
  },
  { timestamps: true }
);

export type CommissionConfigDoc = InferSchemaType<typeof commissionConfigSchema>;
export const CommissionConfigModel: Model<CommissionConfigDoc> =
  models.CommissionConfig ?? model<CommissionConfigDoc>("CommissionConfig", commissionConfigSchema);
