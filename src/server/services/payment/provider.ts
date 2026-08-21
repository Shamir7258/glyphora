export type CheckoutLineItem = {
  name: string;
  description: string;
  amountCents: number;
  quantity: number;
};

export type CreateCheckoutInput = {
  orderId: string;
  orderNumber: string;
  currency: string;
  customerEmail: string;
  lineItems: CheckoutLineItem[];
  successUrl: string;
  cancelUrl: string;
};

export type WebhookEvent =
  | { type: "checkout.session.completed"; orderId: string; providerSessionId: string; providerPaymentId: string; eventId: string }
  | { type: "checkout.session.expired"; orderId: string; providerSessionId: string; eventId: string }
  | { type: "payment_intent.payment_failed"; orderId: string; providerSessionId: string; eventId: string }
  | { type: "unhandled"; eventId: string };

/**
 * Payment abstraction — Stripe is the only implementation in V1, but nothing
 * outside this interface (order/commission logic, webhook route) references
 * Stripe types directly, so Razorpay can be added as a second implementation
 * later (spec §3, §60). Never rely on the frontend's redirect back to `successUrl`
 * to mark an order paid — only a verified webhook does that.
 */
export interface PaymentProvider {
  createCheckoutSession(input: CreateCheckoutInput): Promise<{ url: string; providerSessionId: string }>;
  verifyWebhook(rawBody: string, signature: string): WebhookEvent;
  refund(providerPaymentId: string, amountCents?: number): Promise<void>;
}
