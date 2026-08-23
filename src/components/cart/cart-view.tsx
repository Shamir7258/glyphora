"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { useCart } from "@/hooks/use-cart";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function CartView() {
  const { cart, isLoading, removeItem, applyCoupon } = useCart();
  const [code, setCode] = useState("");

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Your cart is empty"
        description="Browse fonts and add a license to get started."
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
      <div className="flex flex-col gap-4 lg:col-span-2">
        {cart.items.map((item) => (
          <div key={item.id} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
            <div className="min-w-0 flex-1">
              <Link href={`/fonts/${item.font.slug}`} className="font-medium hover:underline">
                {item.font.name}
              </Link>
              <p className="text-sm text-muted-foreground">
                {item.license.name} license
                {item.variant ? ` · ${item.variant.name}` : ""}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">by {item.font.designer.displayName}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="font-medium">{formatPrice(item.unitPriceCents, cart.currency)}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${item.font.name} from cart`}
                onClick={() => removeItem.mutate(item.id)}
                disabled={removeItem.isPending}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="lg:col-span-1">
        <div className="sticky top-24 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-medium">Order summary</h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) applyCoupon.mutate(code.trim());
            }}
            className="flex gap-2"
          >
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Coupon code"
              aria-label="Coupon code"
            />
            <Button type="submit" variant="outline" disabled={applyCoupon.isPending || !code.trim()}>
              Apply
            </Button>
          </form>
          {cart.couponCode && <p className="text-xs text-primary">Coupon &ldquo;{cart.couponCode}&rdquo; applied</p>}

          <div className="flex flex-col gap-2 border-t border-border/70 pt-4 text-sm">
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

          <Button asChild size="lg">
            <Link href="/checkout">Checkout</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
