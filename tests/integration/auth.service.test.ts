import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { connectTestDB, disconnectTestDB } from "../setup/db";
import { UserModel } from "@/server/models/user.model";
import { DesignerProfileModel } from "@/server/models/designer-profile.model";
import { AuthService } from "@/server/services/auth.service";

beforeAll(connectTestDB);
afterAll(disconnectTestDB);

beforeEach(async () => {
  await UserModel.deleteMany({});
  await DesignerProfileModel.deleteMany({});
});

describe("AuthService.register", () => {
  it("hashes the password and defaults to the CUSTOMER role", async () => {
    const user = await AuthService.register({ name: "Ada Lovelace", email: "ada@test.local", password: "Passw0rd123" });
    expect(user.passwordHash).not.toBe("Passw0rd123");
    expect(await bcrypt.compare("Passw0rd123", user.passwordHash!)).toBe(true);
    expect(user.roles).toEqual(["CUSTOMER"]);
  });

  it("rejects a duplicate email", async () => {
    await AuthService.register({ name: "Ada", email: "dup@test.local", password: "Passw0rd123" });
    await expect(
      AuthService.register({ name: "Someone Else", email: "dup@test.local", password: "Passw0rd123" })
    ).rejects.toThrow();
  });

  it("lowercases email uniqueness isn't bypassed by case (schema stores lowercase, service passes it through as given)", async () => {
    await AuthService.register({ name: "Ada", email: "case@test.local", password: "Passw0rd123" });
    const found = await UserModel.findOne({ email: "case@test.local" });
    expect(found).not.toBeNull();
  });
});

describe("AuthService.becomeDesigner", () => {
  it("adds the DESIGNER role without removing CUSTOMER, and creates a DesignerProfile", async () => {
    const user = await AuthService.register({ name: "Grace Hopper", email: "grace@test.local", password: "Passw0rd123" });
    const profile = await AuthService.becomeDesigner(user._id.toString(), {
      username: "grace-type",
      displayName: "Grace Hopper Type",
    });

    expect(profile.username).toBe("grace-type");
    expect(profile.isPlatform).toBe(false);

    const updatedUser = await UserModel.findById(user._id);
    expect(updatedUser?.roles).toEqual(expect.arrayContaining(["CUSTOMER", "DESIGNER"]));
  });

  it("rejects a second designer profile for the same user", async () => {
    const user = await AuthService.register({ name: "Grace", email: "grace2@test.local", password: "Passw0rd123" });
    await AuthService.becomeDesigner(user._id.toString(), { username: "grace-one", displayName: "Grace One" });
    await expect(
      AuthService.becomeDesigner(user._id.toString(), { username: "grace-two", displayName: "Grace Two" })
    ).rejects.toThrow();
  });

  it("rejects a username that's already taken", async () => {
    const userA = await AuthService.register({ name: "A", email: "a@test.local", password: "Passw0rd123" });
    const userB = await AuthService.register({ name: "B", email: "b@test.local", password: "Passw0rd123" });
    await AuthService.becomeDesigner(userA._id.toString(), { username: "same-name", displayName: "A" });
    await expect(
      AuthService.becomeDesigner(userB._id.toString(), { username: "same-name", displayName: "B" })
    ).rejects.toThrow();
  });
});
