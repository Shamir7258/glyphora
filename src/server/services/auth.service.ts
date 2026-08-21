import bcrypt from "bcryptjs";
import { connectDB } from "@/server/lib/db";
import { UserModel } from "@/server/models/user.model";
import { DesignerProfileModel } from "@/server/models/designer-profile.model";
import { ApiError } from "@/types/errors";
import type { RegisterInput, BecomeDesignerInput } from "@/types/schemas/auth.schema";

const SALT_ROUNDS = 12;

export const AuthService = {
  async register(input: RegisterInput) {
    await connectDB();
    const existing = await UserModel.findOne({ email: input.email }).lean();
    if (existing) throw ApiError.conflict("An account with that email already exists.");

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await UserModel.create({
      email: input.email,
      name: input.name,
      passwordHash,
      roles: ["CUSTOMER"],
    });
    return user;
  },

  async becomeDesigner(userId: string, input: BecomeDesignerInput) {
    await connectDB();
    const existing = await DesignerProfileModel.findOne({ user: userId }).lean();
    if (existing) throw ApiError.conflict("You already have a designer profile.");

    const usernameTaken = await DesignerProfileModel.findOne({ username: input.username }).lean();
    if (usernameTaken) throw ApiError.conflict("That username is taken.");

    const profile = await DesignerProfileModel.create({
      user: userId,
      username: input.username,
      displayName: input.displayName,
      bio: input.bio ?? "",
      website: input.website || null,
    });

    await UserModel.findByIdAndUpdate(userId, { $addToSet: { roles: "DESIGNER" } });

    return profile;
  },
};
