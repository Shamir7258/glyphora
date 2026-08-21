import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";
import { PAYOUT_STATUS } from "@/types/enums";

const payoutSchema = new Schema(
  {
    designer: { type: Types.ObjectId, ref: "DesignerProfile", required: true, index: true },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    status: { type: String, enum: PAYOUT_STATUS, default: "REQUESTED" },
    method: { type: String, default: null },
    destinationDetails: { type: Schema.Types.Mixed, default: null },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
    processedBy: { type: Types.ObjectId, ref: "User", default: null },
    notes: { type: String, default: null },
    transactions: { type: [Types.ObjectId], ref: "Transaction", default: [] },
  },
  { timestamps: true }
);

payoutSchema.index({ designer: 1, status: 1 });

export type PayoutDoc = InferSchemaType<typeof payoutSchema>;
export const PayoutModel: Model<PayoutDoc> = models.Payout ?? model<PayoutDoc>("Payout", payoutSchema);
