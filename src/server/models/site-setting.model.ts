import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

const siteSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String, default: "" },
    updatedBy: { type: Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export type SiteSettingDoc = InferSchemaType<typeof siteSettingSchema>;
export const SiteSettingModel: Model<SiteSettingDoc> =
  models.SiteSetting ?? model<SiteSettingDoc>("SiteSetting", siteSettingSchema);
