"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, ClientApiError } from "@/lib/fetcher";
import type { PayoutStatus } from "@/types/enums";

export function PayoutDecisionActions({ payoutId, status }: { payoutId: string; status: PayoutStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState<PayoutStatus | null>(null);

  async function decide(next: "PROCESSING" | "PAID" | "REJECTED") {
    setPending(next);
    try {
      await apiFetch(`/api/admin/payouts/${payoutId}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      toast.success(
        next === "PAID" ? "Payout marked paid and settled" : next === "REJECTED" ? "Payout rejected" : "Payout moved to processing"
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setPending(null);
    }
  }

  if (status === "PAID" || status === "REJECTED") {
    return <span className="text-xs text-muted-foreground">No further action</span>;
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {status === "REQUESTED" && (
        <Button size="sm" variant="outline" disabled={!!pending} onClick={() => decide("PROCESSING")}>
          {pending === "PROCESSING" ? <Loader2 className="animate-spin" /> : <PlayCircle />} Start processing
        </Button>
      )}
      {status === "PROCESSING" && (
        <Button size="sm" disabled={!!pending} onClick={() => decide("PAID")}>
          {pending === "PAID" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Mark paid
        </Button>
      )}
      <Button size="sm" variant="destructive" disabled={!!pending} onClick={() => decide("REJECTED")}>
        {pending === "REJECTED" ? <Loader2 className="animate-spin" /> : <XCircle />} Reject
      </Button>
    </div>
  );
}
