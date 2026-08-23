"use client";

import { useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Download, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/fetcher";
import type { OrderDTO } from "@/types/dto";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function SuccessView({ orderNumber }: { orderNumber: string }) {
  const pollCount = useRef(0);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["order", orderNumber],
    queryFn: () => apiFetch<OrderDTO>(`/api/orders/${orderNumber}`),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "PAID" || status === "FAILED" || status === "CANCELLED") return false;
      if (pollCount.current >= MAX_POLLS) return false;
      pollCount.current += 1;
      return POLL_INTERVAL_MS;
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 py-16 text-center">
        <XCircle className="size-10 text-destructive" />
        <h1 className="font-display text-2xl font-medium">We couldn&apos;t find that order</h1>
        <p className="text-muted-foreground">Double-check the link, or check your purchases if you&apos;re signed in.</p>
        <Button asChild className="mt-2">
          <Link href="/fonts">Back to browsing</Link>
        </Button>
      </div>
    );
  }

  if (order.status === "FAILED" || order.status === "CANCELLED") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 py-16 text-center">
        <XCircle className="size-10 text-destructive" />
        <h1 className="font-display text-2xl font-medium">Payment wasn&apos;t completed</h1>
        <p className="text-muted-foreground">Order {order.orderNumber} was not charged. You can try again from your cart.</p>
        <Button asChild className="mt-2">
          <Link href="/cart">Back to cart</Link>
        </Button>
      </div>
    );
  }

  if (order.status !== "PAID") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 py-16 text-center">
        <Clock className="size-10 animate-pulse text-primary" />
        <h1 className="font-display text-2xl font-medium">Processing your order…</h1>
        <p className="text-muted-foreground">
          Order <span className="font-medium text-foreground">{order.orderNumber}</span> is on its way — this can take
          a moment while we confirm payment. In this environment (no live Stripe keys), an order may stay pending
          indefinitely; check back on{" "}
          <Link href="/account/purchases" className="underline">
            your purchases
          </Link>{" "}
          later.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-16 text-center">
      <CheckCircle2 className="size-12 text-primary" />
      <div>
        <h1 className="font-display text-3xl font-medium">You&apos;re all set</h1>
        <p className="mt-2 text-muted-foreground">
          Order <span className="font-medium text-foreground">{order.orderNumber}</span> is paid. Your downloads are
          ready below.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{item.font.name}</p>
              <p className="text-sm text-muted-foreground">{item.license.name} license</p>
            </div>
            {item.downloadGranted ? (
              <Button asChild size="sm">
                <a href={`/api/downloads/${item.id}`}>
                  <Download className="size-4" /> Download
                </a>
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">{formatPrice(item.lineTotalCents, order.currency)}</span>
            )}
          </div>
        ))}
      </div>

      <Button asChild variant="outline">
        <Link href="/account/purchases">View all purchases</Link>
      </Button>
    </div>
  );
}
