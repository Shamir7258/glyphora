"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { FontDraftState } from "./types";

/**
 * Loads and refreshes a single draft font's full wizard/edit state, via
 * react-query rather than a raw useEffect+useState (matching the pattern
 * already used by src/hooks/use-favorite.ts and use-cart.ts) — this also
 * sidesteps the newer react-hooks/set-state-in-effect lint rule that flags
 * "setState synchronously inside an effect" for hand-rolled fetch-on-mount hooks.
 */
export function useFontDraft(fontId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["seller-font-draft", fontId] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => apiFetch<FontDraftState>(`/api/seller/fonts/${fontId}`),
    enabled: !!fontId,
  });

  async function refresh() {
    await queryClient.refetchQueries({ queryKey, exact: true });
  }

  return {
    draft: query.data ?? null,
    loading: !!fontId && query.isPending,
    error: query.isError ? "Couldn't load this font — please refresh the page." : null,
    refresh,
  };
}
