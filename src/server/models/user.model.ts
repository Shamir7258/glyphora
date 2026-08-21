import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { ROLES, ACCOUNT_STATUS } from "@/types/enums";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    name: { type: String, required: true, trim: true },
    avatarUrl: { type: String, default: null },
    roles: { type: [String], enum: ROLES, default: ["CUSTOMER"] },
    emailVerifiedAt: { type: Date, default: null },
    status: { type: String, enum: ACCOUNT_STATUS, default: "ACTIVE" },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const UserModel: Model<UserDoc> = models.User ?? model<UserDoc>("User", userSchema);
