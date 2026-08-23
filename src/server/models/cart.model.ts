import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

const cartItemSchema = new Schema(
  {
    font: { type: Types.ObjectId, ref: "Font", required: true },
    license: { type: Types.ObjectId, ref: "FontLicense", required: true },
    variant: { type: Types.ObjectId, ref: "FontVariant", default: null },
    unitPriceCents: { type: Number, required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const cartSchema = new Schema(
  {
    owner: {
      user: { type: Types.ObjectId, ref: "User", default: null },
      guestId: { type: String, default: null },
    },
    items: { type: [cartItemSchema], default: [] },
    // Not in the original DATABASE.md Cart shape — added because CartDTO (already
    // defined in src/types/dto.ts by the foundation phase) carries
    // discountCents/couponCode, which requires the cart to remember which coupon
    // is applied. See docs/agent-reports/frontend-customer.md for the note to
    // fold this into DATABASE.md.
    coupon: { type: Types.ObjectId, ref: "Coupon", default: null },
  },
  { timestamps: true }
);

cartSchema.index({ "owner.user": 1 }, { unique: true, sparse: true });
cartSchema.index({ "owner.guestId": 1 }, { unique: true, sparse: true });

export type CartDoc = InferSchemaType<typeof cartSchema>;
export const CartModel: Model<CartDoc> = models.Cart ?? model<CartDoc>("Cart", cartSchema);
