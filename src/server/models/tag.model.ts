import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { TAG_KIND } from "@/types/enums";

const tagSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    kind: { type: String, enum: TAG_KIND, default: "MOOD" },
  },
  { timestamps: true }
);

export type TagDoc = InferSchemaType<typeof tagSchema>;
export const TagModel: Model<TagDoc> = models.Tag ?? model<TagDoc>("Tag", tagSchema);
