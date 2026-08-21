import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

const favoriteSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true },
    font: { type: Types.ObjectId, ref: "Font", required: true },
    // `collection` shadows an internal Mongoose document property — harmless here
    // (we only ever read/write it through the model, never rely on the shadowed
    // property) but explicitly acknowledged to silence the reserved-pathname
    // warning rather than leaving it looking like an oversight.
    collection: { type: Types.ObjectId, ref: "Collection", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, suppressReservedKeysWarning: true }
);

favoriteSchema.index({ user: 1, font: 1, collection: 1 }, { unique: true });

export type FavoriteDoc = InferSchemaType<typeof favoriteSchema>;
export const FavoriteModel: Model<FavoriteDoc> = models.Favorite ?? model<FavoriteDoc>("Favorite", favoriteSchema);
