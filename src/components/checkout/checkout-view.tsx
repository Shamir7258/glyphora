"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { AlertTriangle, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { EmptyState } from "@/components/shared/empty-state";
import { useCart } from "@/hooks/use-cart";
import { apiFetch, ClientApiError } from "@/lib/fetcher";
import { customerInfoSchema, type CustomerInfoInput } from "@/types/schemas/checkout.schema";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function CheckoutView() {
  const { cart, isLoading } = useCart();
  const { data: session } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const form = useForm<CustomerInfoInput>({
    resolver: zodResolver(customerInfoSchema),
    defaultValues: { name: session?.user?.name ?? "", email: session?.user?.email ?? "" },
  });

  async function onSubmit(values: CustomerInfoInput) {
    setSubmitting(true);
    setCheckoutError(null);
    try {
      const result = await apiFetch<{ redirectUrl: string; orderNumber: string }>("/api/checkout/session", {
        method: "POST",
        body: JSON.stringify({ customerInfo: values }),
      });
      window.location.assign(result.redirectUrl);
    } catch (err) {
      setCheckoutError(
        err instanceof ClientApiError ? err.message : "Something went wrong starting checkout. Please try again."
      );
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Your cart is empty"
        description="Add a font license to your cart before checking out."
        action={
          <Button asChild>
            <Link href="/fonts">Browse fonts</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Review */}
      <div className="flex flex-col gap-4 lg:col-span-2">
        <h2 className="font-display text-lg font-medium">Review your order</h2>
        {cart.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{item.font.name}</p>
              <p className="text-sm text-muted-foreground">{item.license.name} license</p>
            </div>
            <span className="shrink-0 font-medium">{formatPrice(item.unitPriceCents, cart.currency)}</span>
          </div>
        ))}

        <h2 className="mt-4 font-display text-lg font-medium">Your details</h2>
        {checkoutError && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Checkout isn&apos;t available</AlertTitle>
            <AlertDescription>{checkoutError}</AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jordan Lee" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-xs text-muted-foreground">
              We&apos;ll send your download links and receipt to this email.
            </p>
            <Button type="submit" size="lg" disabled={submitting} className="mt-2 lg:hidden">
              {submitting ? "Starting checkout…" : `Pay ${formatPrice(cart.totalCents, cart.currency)}`}
            </Button>
          </form>
        </Form>
      </div>

      {/* Summary */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-medium">Order total</h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(cart.subtotalCents, cart.currency)}</span>
            </div>
            {cart.discountCents > 0 && (
              <div className="flex justify-between text-primary">
                <span>Discount</span>
                <span>-{formatPrice(cart.discountCents, cart.currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border/70 pt-2 font-medium">
              <span>Total</span>
              <span>{formatPrice(cart.totalCents, cart.currency)}</span>
            </div>
          </div>
          <Button size="lg" onClick={form.handleSubmit(onSubmit)} disabled={submitting} className="hidden lg:inline-flex">
            {submitting ? "Starting checkout…" : `Pay ${formatPrice(cart.totalCents, cart.currency)}`}
          </Button>
          <p className="text-xs text-muted-foreground">You&apos;ll be redirected to Stripe to complete payment securely.</p>
        </div>
      </div>
    </div>
  );
}
