import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";
import { ANALYTICS_EVENT_TYPE } from "@/types/enums";

const analyticsEventSchema = new Schema(
  {
    type: { type: String, enum: ANALYTICS_EVENT_TYPE, required: true, index: true },
    user: { type: Types.ObjectId, ref: "User", default: null },
    font: { type: Types.ObjectId, ref: "Font", default: null },
    query: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Raw events age out after 180 days; V2 can roll up aggregates before they expire.
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export type AnalyticsEventDoc = InferSchemaType<typeof analyticsEventSchema>;
export const AnalyticsEventModel: Model<AnalyticsEventDoc> =
  models.AnalyticsEvent ?? model<AnalyticsEventDoc>("AnalyticsEvent", analyticsEventSchema);
