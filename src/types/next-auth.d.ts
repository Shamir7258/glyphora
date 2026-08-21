import type { Role } from "@/types/enums";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: Role[];
      designerProfileId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    // Optional: only the Credentials `authorize()` return value carries these.
    // An OAuth profile hits the `else` branch in the jwt callback and looks them
    // up from the DB instead — see src/server/lib/auth.ts.
    roles?: Role[];
    designerProfileId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roles: Role[];
    designerProfileId: string | null;
  }
}
