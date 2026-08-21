import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";
import { COUPON_TYPE, COUPON_APPLIES_TO } from "@/types/enums";

const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: COUPON_TYPE, required: true },
    value: { type: Number, required: true, min: 0 },
    appliesTo: { type: String, enum: COUPON_APPLIES_TO, default: "ALL" },
    appliesToRef: { type: Types.ObjectId, default: null },
    minSubtotalCents: { type: Number, default: 0 },
    maxRedemptions: { type: Number, default: null },
    redemptionCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type CouponDoc = InferSchemaType<typeof couponSchema>;
export const CouponModel: Model<CouponDoc> = models.Coupon ?? model<CouponDoc>("Coupon", couponSchema);
