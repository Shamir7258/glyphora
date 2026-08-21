"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, ClientApiError } from "@/lib/fetcher";
import type { AccountStatus } from "@/types/enums";

/** Shared suspend/reactivate control for both the designers and customers pages. */
export function AccountStatusAction({
  id,
  status,
  endpoint,
}: {
  id: string;
  status: AccountStatus;
  endpoint: "designers" | "customers";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next: AccountStatus = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setPending(true);
    try {
      await apiFetch(`/api/admin/${endpoint}/${id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      toast.success(next === "SUSPENDED" ? "Account suspended" : "Account reactivated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button size="sm" variant={status === "ACTIVE" ? "outline" : "secondary"} disabled={pending} onClick={toggle}>
      {status === "ACTIVE" ? (
        <>
          <Ban /> Suspend
        </>
      ) : (
        <>
          <RotateCcw /> Reactivate
        </>
      )}
    </Button>
  );
}
