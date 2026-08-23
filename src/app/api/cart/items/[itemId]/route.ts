import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { CartRepository } from "@/server/repositories/cart.repository";
import { resolveCartOwner } from "@/server/lib/cart-owner";
import { attachGuestCookie } from "@/server/lib/guest-cart";

export const DELETE = withApiHandler(
  async (request: NextRequest, ctx: { params: Promise<{ itemId: string }> }) => {
    const { itemId } = await ctx.params;
    const { owner, newGuestId } = await resolveCartOwner(request);
    const cart = await CartRepository.removeItem(owner, itemId);
    const response = apiOk(await CartRepository.toDTO(cart));
    return newGuestId ? attachGuestCookie(response, newGuestId) : response;
  }
);
