import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

// A user's named folder of favorited fonts (e.g. "My Logo Fonts"). Distinct from a
// MongoDB "collection" — the name is kept because it matches the product spec.
const collectionSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    isPublic: { type: Boolean, default: false },
    fonts: { type: [Types.ObjectId], ref: "Font", default: [] },
  },
  { timestamps: true }
);

export type CollectionDoc = InferSchemaType<typeof collectionSchema>;
export const CollectionModel: Model<CollectionDoc> =
  models.Collection ?? model<CollectionDoc>("Collection", collectionSchema);
