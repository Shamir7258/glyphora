import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";
import { ORDER_STATUS } from "@/types/enums";

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Types.ObjectId, ref: "User", default: null },
    customerInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
    },
    items: { type: [Types.ObjectId], ref: "OrderItem", default: [] },
    subtotalCents: { type: Number, required: true },
    discountCents: { type: Number, default: 0 },
    taxCents: { type: Number, default: 0 },
    processingFeeCents: { type: Number, default: 0 },
    grandTotalCents: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    coupon: { type: Types.ObjectId, ref: "Coupon", default: null },
    status: { type: String, enum: ORDER_STATUS, default: "PENDING", index: true },
    payment: { type: Types.ObjectId, ref: "Payment", default: null },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });

export type OrderDoc = InferSchemaType<typeof orderSchema>;
export const OrderModel: Model<OrderDoc> = models.Order ?? model<OrderDoc>("Order", orderSchema);
