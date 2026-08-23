import { NextResponse, type NextRequest } from "next/server";
import { paymentProvider } from "@/server/services/payment";
import { OrderService } from "@/server/services/order.service";
import { OrderRepository } from "@/server/repositories/order.repository";

/**
 * Stripe webhook — no session auth, signature verification instead (spec §61,
 * docs/API_CONTRACTS.md). Deliberately NOT wrapped in withApiHandler/apiOk/apiError:
 * this endpoint has its own external contract (Stripe expects a 2xx to stop
 * retrying, and doesn't care about our { ok, data|error } envelope), and needs
 * the RAW request body for signature verification — never `.json()`, which would
 * re-serialize the body and break the HMAC check.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event;
  try {
    event = paymentProvider.verifyWebhook(rawBody, signature);
  } catch (err) {
    console.error("[webhooks/stripe] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await OrderService.markPaid(event.orderId, event.providerSessionId, event.providerPaymentId, event.eventId);
        break;
      case "checkout.session.expired":
        await OrderRepository.markExpired(event.orderId);
        break;
      case "payment_intent.payment_failed":
        await OrderRepository.markFailed(event.orderId);
        break;
      case "unhandled":
        break;
    }
  } catch (err) {
    // Log and still ack with 200 where we can — an application-level failure to
    // process a well-formed, correctly-signed event shouldn't cause Stripe to
    // hammer retries forever; it's surfaced via server logs / AuditLog instead.
    console.error("[webhooks/stripe] handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
