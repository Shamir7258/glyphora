import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { applyCouponSchema } from "@/types/schemas/checkout.schema";
import { CartRepository } from "@/server/repositories/cart.repository";
import { resolveCartOwner } from "@/server/lib/cart-owner";
import { attachGuestCookie } from "@/server/lib/guest-cart";

export const POST = withApiHandler(async (request: NextRequest) => {
  const { owner, newGuestId } = await resolveCartOwner(request);
  const body = await request.json();
  const input = applyCouponSchema.parse(body);

  const cart = await CartRepository.applyCoupon(owner, input.code);
  const response = apiOk(await CartRepository.toDTO(cart));
  return newGuestId ? attachGuestCookie(response, newGuestId) : response;
});
