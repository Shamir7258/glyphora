import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@/types/enums";

// Next.js 16 renamed `middleware.ts`/`export function middleware` to
// `proxy.ts`/`export function proxy` (nodejs runtime only). This is a UX guard —
// it redirects signed-out/under-privileged users away from gated route groups so
// they don't land on a broken page. It is NOT the security boundary: every
// mutating route handler and Server Action independently calls requireRole()/
// requireOwnership() from src/server/lib/session.ts, because a client can always
// call the API directly and bypass this file.
const ROLE_GATES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/admin", roles: ["ADMIN", "SUPER_ADMIN"] },
  { prefix: "/seller", roles: ["DESIGNER", "ADMIN", "SUPER_ADMIN"] },
];
const AUTH_ONLY_PREFIXES = ["/account"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const roleGate = ROLE_GATES.find((g) => pathname.startsWith(g.prefix));
  const needsAuthOnly = AUTH_ONLY_PREFIXES.some((p) => pathname.startsWith(p));

  if (!roleGate && !needsAuthOnly) return NextResponse.next();

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (roleGate) {
    const roles = (token.roles as Role[] | undefined) ?? [];
    const allowed = roles.some((r) => roleGate.roles.includes(r));
    if (!allowed) return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/seller/:path*", "/account/:path*"],
};
