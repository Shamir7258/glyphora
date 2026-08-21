import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";
import { PAYMENT_STATUS } from "@/types/enums";

// A field literally named `type` inside a subdocument confuses Mongoose's schema
// parser (it looks like a type descriptor, not a field) — named `eventType` to
// sidestep that entirely, and declared as its own Schema for a clean inferred type.
const webhookEventSchema = new Schema(
  {
    eventId: { type: String, required: true },
    eventType: { type: String, required: true },
    receivedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const paymentSchema = new Schema(
  {
    order: { type: Types.ObjectId, ref: "Order", required: true },
    provider: { type: String, enum: ["STRIPE"], default: "STRIPE" },
    providerSessionId: { type: String, required: true, unique: true },
    providerPaymentId: { type: String, default: null, unique: true, sparse: true },
    status: { type: String, enum: PAYMENT_STATUS, default: "REQUIRES_PAYMENT" },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    webhookEventLog: { type: [webhookEventSchema], default: [] },
  },
  { timestamps: true }
);

export type PaymentDoc = InferSchemaType<typeof paymentSchema>;
export const PaymentModel: Model<PaymentDoc> = models.Payment ?? model<PaymentDoc>("Payment", paymentSchema);
