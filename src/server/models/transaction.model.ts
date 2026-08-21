import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";
import { TRANSACTION_TYPE } from "@/types/enums";

const transactionSchema = new Schema(
  {
    type: { type: String, enum: TRANSACTION_TYPE, required: true },
    order: { type: Types.ObjectId, ref: "Order", default: null },
    orderItem: { type: Types.ObjectId, ref: "OrderItem", default: null },
    designer: { type: Types.ObjectId, ref: "DesignerProfile", default: null, index: true },
    grossAmountCents: { type: Number, required: true },
    platformFeeCents: { type: Number, default: 0 },
    designerShareCents: { type: Number, default: 0 },
    taxCents: { type: Number, default: 0 },
    processingFeeCents: { type: Number, default: 0 },
    netAmountCents: { type: Number, required: true },
    commissionPercentageUsed: { type: Number, default: null },
    currency: { type: String, default: "USD" },
    payout: { type: Types.ObjectId, ref: "Payout", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

transactionSchema.index({ designer: 1, createdAt: -1 });
transactionSchema.index({ order: 1 });

export type TransactionDoc = InferSchemaType<typeof transactionSchema>;
export const TransactionModel: Model<TransactionDoc> =
  models.Transaction ?? model<TransactionDoc>("Transaction", transactionSchema);
