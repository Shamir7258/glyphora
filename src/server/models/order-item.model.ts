import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

const orderItemSchema = new Schema(
  {
    order: { type: Types.ObjectId, ref: "Order", required: true, index: true },
    font: { type: Types.ObjectId, ref: "Font", required: true },
    variant: { type: Types.ObjectId, ref: "FontVariant", default: null },
    license: { type: Types.ObjectId, ref: "FontLicense", required: true },
    designer: { type: Types.ObjectId, ref: "DesignerProfile", required: true, index: true },
    unitPriceCents: { type: Number, required: true },
    quantity: { type: Number, default: 1 },
    lineTotalCents: { type: Number, required: true },
    // Snapshot at time of sale — never recompute historical earnings from the
    // current commission config (spec §22).
    commissionPercentageAtSale: { type: Number, required: true },
    designerShareCents: { type: Number, required: true },
    platformFeeCents: { type: Number, required: true },
    downloadGranted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

orderItemSchema.index({ designer: 1, createdAt: -1 });

export type OrderItemDoc = InferSchemaType<typeof orderItemSchema>;
export const OrderItemModel: Model<OrderItemDoc> =
  models.OrderItem ?? model<OrderItemDoc>("OrderItem", orderItemSchema);
