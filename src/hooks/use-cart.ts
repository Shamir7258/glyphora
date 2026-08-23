"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/fetcher";
import type { CartDTO } from "@/types/dto";

/** Talks to /api/cart/** (backend API agent) — see docs/API_CONTRACTS.md. */
export function useCart() {
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: () => apiFetch<CartDTO>("/api/cart"),
    staleTime: 10_000,
  });

  const addItem = useMutation({
    mutationFn: (input: { fontId: string; licenseId: string; variantId?: string }) =>
      apiFetch<CartDTO>("/api/cart/items", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (cart) => {
      queryClient.setQueryData(["cart"], cart);
      toast.success("Added to cart");
    },
    onError: () => toast.error("Couldn't add that to your cart — please try again."),
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => apiFetch<CartDTO>(`/api/cart/items/${itemId}`, { method: "DELETE" }),
    onSuccess: (cart) => queryClient.setQueryData(["cart"], cart),
    onError: () => toast.error("Couldn't remove that item — please try again."),
  });

  const applyCoupon = useMutation({
    mutationFn: (code: string) => apiFetch<CartDTO>("/api/cart/coupon", { method: "POST", body: JSON.stringify({ code }) }),
    onSuccess: (cart) => {
      queryClient.setQueryData(["cart"], cart);
      toast.success(cart.couponCode ? `Coupon "${cart.couponCode}" applied` : "Coupon applied");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "That coupon code isn't valid."),
  });

  return {
    cart: cartQuery.data,
    isLoading: cartQuery.isLoading,
    itemCount: cartQuery.data?.items.length ?? 0,
    addItem,
    removeItem,
    applyCoupon,
  };
}
