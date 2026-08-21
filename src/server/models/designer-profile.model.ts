import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";
import { ACCOUNT_STATUS } from "@/types/enums";

const designerProfileSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, unique: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    bio: { type: String, default: "" },
    avatarUrl: { type: String, default: null },
    coverImageUrl: { type: String, default: null },
    website: { type: String, default: null },
    socialLinks: {
      twitter: { type: String, default: null },
      instagram: { type: String, default: null },
      behance: { type: String, default: null },
      dribbble: { type: String, default: null },
    },
    isPlatform: { type: Boolean, default: false },
    payoutMethod: { type: String, default: null },
    payoutDetails: { type: Schema.Types.Mixed, default: null },
    stats: {
      totalProducts: { type: Number, default: 0 },
      totalSalesCount: { type: Number, default: 0 },
      totalRevenueCents: { type: Number, default: 0 },
    },
    status: { type: String, enum: ACCOUNT_STATUS, default: "ACTIVE" },
  },
  { timestamps: true }
);

export type DesignerProfileDoc = InferSchemaType<typeof designerProfileSchema>;
export const DesignerProfileModel: Model<DesignerProfileDoc> =
  models.DesignerProfile ?? model<DesignerProfileDoc>("DesignerProfile", designerProfileSchema);
