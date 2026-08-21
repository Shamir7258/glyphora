import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";
import { REVIEW_STATUS } from "@/types/enums";

const reviewSchema = new Schema(
  {
    font: { type: Types.ObjectId, ref: "Font", required: true, index: true },
    user: { type: Types.ObjectId, ref: "User", required: true },
    order: { type: Types.ObjectId, ref: "Order", required: true }, // proof of purchase
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
    status: { type: String, enum: REVIEW_STATUS, default: "PUBLISHED" },
  },
  { timestamps: true }
);

reviewSchema.index({ font: 1, status: 1 });
reviewSchema.index({ font: 1, user: 1 }, { unique: true });

export type ReviewDoc = InferSchemaType<typeof reviewSchema>;
export const ReviewModel: Model<ReviewDoc> = models.Review ?? model<ReviewDoc>("Review", reviewSchema);
