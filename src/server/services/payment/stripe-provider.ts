import Stripe from "stripe";
import type { PaymentProvider, CreateCheckoutInput, WebhookEvent } from "@/server/services/payment/provider";

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Checkout is stubbed until Stripe test keys are added to .env.local " +
        "(see docs/DEVELOPMENT.md)."
    );
  }
  stripeClient = new Stripe(key);
  return stripeClient;
}

export const StripeProvider: PaymentProvider = {
  async createCheckoutSession(input: CreateCheckoutInput) {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: input.customerEmail,
      client_reference_id: input.orderId,
      metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      line_items: input.lineItems.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: item.amountCents,
          product_data: { name: item.name, description: item.description },
        },
      })),
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { url: session.url, providerSessionId: session.id };
  },

  verifyWebhook(rawBody: string, signature: string): WebhookEvent {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");

    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.client_reference_id ?? session.metadata?.orderId;
        if (!orderId) return { type: "unhandled", eventId: event.id };
        return {
          type: "checkout.session.completed",
          orderId,
          providerSessionId: session.id,
          providerPaymentId:
            typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? session.id),
          eventId: event.id,
        };
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.client_reference_id ?? session.metadata?.orderId;
        if (!orderId) return { type: "unhandled", eventId: event.id };
        return { type: "checkout.session.expired", orderId, providerSessionId: session.id, eventId: event.id };
      }
      default:
        return { type: "unhandled", eventId: event.id };
    }
  },

  async refund(providerPaymentId: string, amountCents?: number) {
    const stripe = getStripe();
    await stripe.refunds.create({
      payment_intent: providerPaymentId,
      amount: amountCents,
    });
  },
};
