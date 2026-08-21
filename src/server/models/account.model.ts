import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

// Auth.js (next-auth) OAuth account linkage — standard Auth.js Mongoose adapter shape.
const accountSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    provider: { type: String, required: true },
    providerAccountId: { type: String, required: true },
    refresh_token: String,
    access_token: String,
    expires_at: Number,
    token_type: String,
    scope: String,
    id_token: String,
    session_state: String,
  },
  { timestamps: true }
);

accountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });

export type AccountDoc = InferSchemaType<typeof accountSchema>;
export const AccountModel: Model<AccountDoc> = models.Account ?? model<AccountDoc>("Account", accountSchema);
