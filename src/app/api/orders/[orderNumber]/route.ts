import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { OrderRepository } from "@/server/repositories/order.repository";
import { getSession } from "@/server/lib/session";
import { ApiError } from "@/types/errors";
import { rateLimit, getClientIp } from "@/server/lib/rate-limit";

export const GET = withApiHandler(
  async (request: NextRequest, ctx: { params: Promise<{ orderNumber: string }> }) => {
    // A guest order's orderNumber (nanoid(6), ~2.2B combinations/day) is its own
    // access capability — there's no session to check ownership against right off
    // the Stripe redirect. That's an acceptable V1 tradeoff for a *single* guess,
    // but with no throttling an attacker could still script enumeration attempts
    // against the keyspace to find a real order (leaking a guest's name/email).
    // IP-keyed rather than orderNumber-keyed: the threat is one IP trying many
    // numbers, not many IPs retrying one number.
    rateLimit(`order-lookup:${getClientIp(request)}`, 30, 5 * 60_000);

    const { orderNumber } = await ctx.params;
    const order = await OrderRepository.findByOrderNumber(orderNumber);
    if (!order) throw ApiError.notFound("We couldn't find that order.");

    const session = await getSession();
    const emailParam = new URL(request.url).searchParams.get("email")?.toLowerCase();
    const isOwner = !!session?.user && order.user?.toString() === session.user.id;
    const isGuestMatch = !!emailParam && emailParam === order.customerInfo?.email?.toLowerCase();
    // Guest checkout has no session to check ownership against — the unguessable
    // orderNumber itself is the V1 access capability for guest orders straight off
    // the Stripe redirect (docs/DEVELOPMENT.md "guest checkout" decision). Orders
    // tied to a real account always require session ownership (or the email-match
    // fallback, used by the "resend access" flow).
    const isUnclaimedGuestOrder = !order.user;

    if (!isOwner && !isGuestMatch && !isUnclaimedGuestOrder) {
      throw ApiError.forbidden("You don't have access to this order.");
    }

    return apiOk(await OrderRepository.toDTO(order));
  }
);
