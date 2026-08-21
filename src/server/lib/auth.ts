import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDB } from "@/server/lib/db";
import { UserModel } from "@/server/models/user.model";
import { DesignerProfileModel } from "@/server/models/designer-profile.model";
import { loginSchema } from "@/types/schemas/auth.schema";
import { rateLimit } from "@/server/lib/rate-limit";
import { ApiError } from "@/types/errors";
import type { Role } from "@/types/enums";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const parsed = loginSchema.safeParse(raw);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;

      // Keyed by email rather than IP: this is the actual login-attempt path
      // (unlike POST /api/auth/register, which has its own IP-keyed limit) and
      // the thing worth bounding is brute-forcing one account's password, which
      // an attacker can do from many IPs. Generous enough not to lock out a user
      // who mistypes their password a few times.
      try {
        rateLimit(`login:${email}`, 10, 5 * 60_000);
      } catch (err) {
        if (err instanceof ApiError) return null; // NextAuth's authorize() signals failure via null, not a thrown response
        throw err;
      }

      await connectDB();
      const user = await UserModel.findOne({ email });
      if (!user || !user.passwordHash) return null;
      if (user.status === "SUSPENDED") return null;

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return null;

      const designer = await DesignerProfileModel.findOne({ user: user._id }).select("_id").lean();

      return {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        image: user.avatarUrl ?? undefined,
        roles: user.roles as Role[],
        designerProfileId: designer ? designer._id.toString() : null,
      };
    },
  }),
];

// OAuth is architecture-ready: adding credentials to .env is enough to enable it,
// no code changes required (spec §3 "OAuth-ready architecture").
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, account }) {
      // OAuth sign-ins: find-or-create the Mongo User record since we run without
      // a persistence adapter (JWT-only sessions).
      if (account?.provider && account.provider !== "credentials") {
        await connectDB();
        const email = user.email?.toLowerCase();
        if (!email) return false;
        let dbUser = await UserModel.findOne({ email });
        if (!dbUser) {
          dbUser = await UserModel.create({
            email,
            name: user.name ?? email.split("@")[0],
            avatarUrl: user.image ?? null,
            roles: ["CUSTOMER"],
            emailVerifiedAt: new Date(),
          });
        }
        if (dbUser.status === "SUSPENDED") return false;
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        // Credentials provider already returned the shaped fields; OAuth needs a
        // DB lookup since `user` there is just the provider profile.
        if ("roles" in user) {
          token.id = user.id;
          token.roles = user.roles as Role[];
          token.designerProfileId = user.designerProfileId as string | null;
        } else {
          await connectDB();
          const dbUser = await UserModel.findOne({ email: user.email?.toLowerCase() });
          if (dbUser) {
            const designer = await DesignerProfileModel.findOne({ user: dbUser._id })
              .select("_id")
              .lean();
            token.id = dbUser._id.toString();
            token.roles = dbUser.roles as Role[];
            token.designerProfileId = designer ? designer._id.toString() : null;
          }
        }
      } else if (trigger === "update") {
        // Client explicitly asked for a refresh (e.g. right after becoming a
        // designer) — re-derive roles/designerProfileId without waiting for
        // re-login.
        await connectDB();
        const dbUser = await UserModel.findById(token.id);
        if (dbUser) {
          const designer = await DesignerProfileModel.findOne({ user: dbUser._id })
            .select("_id")
            .lean();
          token.roles = dbUser.roles as Role[];
          token.designerProfileId = designer ? designer._id.toString() : null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.roles = token.roles ?? ["CUSTOMER"];
      session.user.designerProfileId = token.designerProfileId ?? null;
      return session;
    },
  },
};
