import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { checkoutSessionSchema } from "@/types/schemas/checkout.schema";
import { CartRepository } from "@/server/repositories/cart.repository";
import { resolveCartOwner } from "@/server/lib/cart-owner";
import { OrderService } from "@/server/services/order.service";
import { ApiError } from "@/types/errors";
import { rateLimit, getClientIp } from "@/server/lib/rate-limit";

export const POST = withApiHandler(async (request: NextRequest) => {
  rateLimit(`checkout:${getClientIp(request)}`, 10, 60_000);

  const { owner } = await resolveCartOwner(request);
  const body = await request.json();
  const input = checkoutSessionSchema.parse(body);

  const cart = await CartRepository.find(owner);
  if (!cart || cart.items.length === 0) throw ApiError.validation("Your cart is empty.");

  const order = await OrderService.createOrderFromCart(cart, input.customerInfo);

  // Fold the cart's coupon (a field OrderService predates — see
  // docs/agent-reports/frontend-customer.md) into the freshly created order's
  // totals so cart/order/success all agree on the discounted price.
  const { discountCents } = await CartRepository.computeDiscount(cart);
  if (discountCents > 0) {
    order.discountCents = discountCents;
    order.grandTotalCents = Math.max(0, order.subtotalCents - discountCents);
    order.coupon = cart.coupon ?? null;
    await order.save();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  let redirectUrl: string;
  try {
    redirectUrl = await OrderService.startCheckout(order, appUrl);
  } catch {
    // Most likely cause in this environment: STRIPE_SECRET_KEY isn't set (see
    // docs/DEVELOPMENT.md — payments are intentionally stubbed until real keys
    // are added). The order stays PENDING; nothing was charged.
    throw ApiError.paymentFailed(
      "Checkout isn't configured yet in this environment — Stripe keys haven't been added. Your order was saved as pending."
    );
  }

  await CartRepository.clear(owner);
  return apiOk({ redirectUrl, orderNumber: order.orderNumber });
});
