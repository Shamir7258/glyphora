"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, MessageSquareWarning, Ban, Archive, Rocket, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiFetch, ClientApiError } from "@/lib/fetcher";
import type { FontStatus } from "@/types/enums";

type Props = {
  fontId: string;
  status: FontStatus;
  isPlatform: boolean;
};

async function post(path: string, body?: unknown) {
  return apiFetch(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}

export function FontModerationActions({ fontId, status, isPlatform }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"REJECT" | "REQUEST_CHANGES">("REJECT");
  const [suspendReason, setSuspendReason] = useState("");

  async function run(label: string, action: () => Promise<unknown>) {
    setPending(true);
    try {
      await action();
      toast.success(label);
      router.refresh();
    } catch (err) {
      const message = err instanceof ClientApiError ? err.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  async function handleApprove() {
    await run("Font approved", async () => {
      const res = await post(`/api/admin/fonts/${fontId}/approve`);
      return res;
    });
  }

  async function handleReject() {
    if (reason.trim().length < 10) {
      toast.error("Give the designer a specific reason (min 10 characters).");
      return;
    }
    await run(mode === "REQUEST_CHANGES" ? "Changes requested" : "Font rejected", async () => {
      await post(`/api/admin/fonts/${fontId}/reject`, { reason, mode });
      setRejectOpen(false);
      setReason("");
    });
  }

  async function handlePublish() {
    await run("Font published", () => post(`/api/admin/fonts/${fontId}/publish`));
  }

  async function handleSuspend() {
    await run("Font suspended", async () => {
      await post(`/api/admin/fonts/${fontId}/suspend`, { reason: suspendReason || undefined });
      setSuspendOpen(false);
      setSuspendReason("");
    });
  }

  async function handleReactivate() {
    await run("Font reactivated", () => post(`/api/admin/fonts/${fontId}/reactivate`));
  }

  async function handleArchive() {
    await run("Font archived", () => post(`/api/admin/fonts/${fontId}/archive`));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "PENDING_REVIEW" && (
        <>
          <Button size="sm" disabled={pending} onClick={handleApprove}>
            <Check /> Approve{isPlatform ? " & publish" : ""}
          </Button>

          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="destructive" disabled={pending}>
                <X /> Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject submission</DialogTitle>
                <DialogDescription>
                  The designer sees this reason and can revise and resubmit. Choose &ldquo;Request
                  changes&rdquo; for a softer tone on the same underlying status.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "REJECT" ? "default" : "outline"}
                  onClick={() => setMode("REJECT")}
                >
                  Reject
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "REQUEST_CHANGES" ? "default" : "outline"}
                  onClick={() => setMode("REQUEST_CHANGES")}
                >
                  Request changes
                </Button>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reject-reason">Reason (min 10 characters)</Label>
                <Textarea
                  id="reject-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    mode === "REQUEST_CHANGES"
                      ? "e.g. The Bold weight is missing a glyph set — please add it and resubmit."
                      : "e.g. This font is too similar to an existing commercial release."
                  }
                  rows={4}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" disabled={pending} onClick={handleReject}>
                  <MessageSquareWarning /> {mode === "REQUEST_CHANGES" ? "Request changes" : "Reject"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {status === "APPROVED" && !isPlatform && (
        <Button size="sm" disabled={pending} onClick={handlePublish}>
          <Rocket /> Publish
        </Button>
      )}

      {(status === "APPROVED" || status === "PUBLISHED") && (
        <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" disabled={pending}>
              <Ban /> Suspend
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Suspend this font</DialogTitle>
              <DialogDescription>
                Immediately pulls it from the storefront if published. This can be reversed with
                Reactivate.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="suspend-reason">Internal note (optional)</Label>
              <Textarea
                id="suspend-reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSuspendOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" disabled={pending} onClick={handleSuspend}>
                <Ban /> Suspend
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {status === "SUSPENDED" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={handleReactivate}>
          <RotateCcw /> Reactivate
        </Button>
      )}

      {status !== "ARCHIVED" && status !== "DRAFT" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={handleArchive}>
          <Archive /> Archive
        </Button>
      )}
    </div>
  );
}
