"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, ClientApiError } from "@/lib/fetcher";

export function CommissionForm({ currentPercentage }: { currentPercentage: number }) {
  const router = useRouter();
  const [percentage, setPercentage] = useState(String(currentPercentage));
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(percentage);
    if (Number.isNaN(value) || value < 0 || value > 100) {
      toast.error("Enter a percentage between 0 and 100.");
      return;
    }
    setPending(true);
    try {
      await apiFetch("/api/admin/commission", {
        method: "POST",
        body: JSON.stringify({ percentage: value, note: note || undefined }),
      });
      toast.success(`New commission rate (${value}%) is now effective.`);
      setNote("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="commission-percentage">New commission percentage</Label>
        <div className="flex items-center gap-2">
          <Input
            id="commission-percentage"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            className="max-w-32"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="commission-note">Note (optional)</Label>
        <Textarea
          id="commission-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Reducing platform take for Q3 designer promotion"
          rows={3}
        />
      </div>
      <Button type="submit" disabled={pending}>
        Set new rate
      </Button>
      <p className="text-xs text-muted-foreground">
        This appends a new versioned row effective immediately — it never edits history. Past
        orders keep the commission percentage that was in effect when they sold (spec §22).
      </p>
    </form>
  );
}
