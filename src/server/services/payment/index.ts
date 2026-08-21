import { StripeProvider } from "@/server/services/payment/stripe-provider";
import type { PaymentProvider } from "@/server/services/payment/provider";

// Single switch point for a future Razorpay/other provider — see docs/ARCHITECTURE.md §7.
export const paymentProvider: PaymentProvider = StripeProvider;

export * from "@/server/services/payment/provider";
