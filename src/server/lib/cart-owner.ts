import type { NextRequest } from "next/server";
import { getSession } from "@/server/lib/session";
import { resolveGuestId } from "@/server/lib/guest-cart";
import type { CartOwner } from "@/server/repositories/cart.repository";

/**
 * Every cart/checkout route needs to know "whose cart is this" without forcing a
 * sign-in — guest checkout is allowed (docs/DEVELOPMENT.md). Signed-in users are
 * always resolved by session; everyone else by a `guestId` cookie, minted here on
 * first touch. Callers must attach the returned `newGuestId` to the response with
 * `attachGuestCookie()` (src/server/lib/guest-cart.ts) when non-null.
 */
export async function resolveCartOwner(
  request: NextRequest
): Promise<{ owner: CartOwner; newGuestId: string | null }> {
  const session = await getSession();
  if (session?.user) {
    return { owner: { userId: session.user.id }, newGuestId: null };
  }
  const { guestId, isNew } = resolveGuestId(request);
  return { owner: { guestId }, newGuestId: isNew ? guestId : null };
}
