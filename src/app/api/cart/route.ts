import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { CartRepository } from "@/server/repositories/cart.repository";
import { resolveCartOwner } from "@/server/lib/cart-owner";
import { attachGuestCookie } from "@/server/lib/guest-cart";

export const GET = withApiHandler(async (request: NextRequest) => {
  const { owner, newGuestId } = await resolveCartOwner(request);
  const cart = await CartRepository.findOrCreate(owner);
  const response = apiOk(await CartRepository.toDTO(cart));
  return newGuestId ? attachGuestCookie(response, newGuestId) : response;
});
