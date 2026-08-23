import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { nanoid } from "nanoid";

// Guest checkout (spec doesn't forbid it; see docs/DEVELOPMENT.md "Decisions made
// to keep this unblocked"). A guest's cart is keyed off a signed-ish, httpOnly
// cookie id — not cryptographically signed (no secret needed: it's just an opaque
// random identifier, not a trust boundary by itself — cart ownership is checked
// per-cart-doc, and checkout requires customerInfo either way).
export const GUEST_COOKIE_NAME = "guestId";
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function readGuestId(request: NextRequest): string | null {
  return request.cookies.get(GUEST_COOKIE_NAME)?.value ?? null;
}

/** Returns the existing guest id from the request, or mints a new one. */
export function resolveGuestId(request: NextRequest): { guestId: string; isNew: boolean } {
  const existing = readGuestId(request);
  if (existing) return { guestId: existing, isNew: false };
  return { guestId: nanoid(24), isNew: true };
}

export function attachGuestCookie<T extends NextResponse>(response: T, guestId: string): T {
  response.cookies.set(GUEST_COOKIE_NAME, guestId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: GUEST_COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}
