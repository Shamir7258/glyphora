"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/lib/fetcher";

/**
 * Optimistic favorite toggle. Talks to POST/DELETE /api/favorites (owned by the
 * backend API agent — see docs/API_CONTRACTS.md). Signed-out users are sent to
 * /login rather than seeing a silent failure.
 */
export function useFavorite(fontId: string, initialFavoriteId: string | null) {
  const { status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: () => apiFetch<{ id: string }>("/api/favorites", { method: "POST", body: JSON.stringify({ fontId }) }),
    onSuccess: () => {
      toast.success("Added to favorites");
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: () => toast.error("Couldn't save that favorite — please try again."),
  });

  const removeMutation = useMutation({
    mutationFn: (favoriteId: string) => apiFetch<{ ok: true }>(`/api/favorites/${favoriteId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast("Removed from favorites");
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: () => toast.error("Couldn't remove that favorite — please try again."),
  });

  function toggle(currentFavoriteId: string | null) {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (currentFavoriteId) removeMutation.mutate(currentFavoriteId);
    else addMutation.mutate();
  }

  return {
    toggle,
    isPending: addMutation.isPending || removeMutation.isPending,
    initialFavoriteId,
  };
}
