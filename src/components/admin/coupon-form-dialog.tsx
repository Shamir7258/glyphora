"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiFetch, ClientApiError } from "@/lib/fetcher";
import type { CouponType, CouponAppliesTo } from "@/types/enums";

export type CouponEditTarget = {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  appliesTo: CouponAppliesTo;
  minSubtotalCents: number;
  maxRedemptions?: number;
  isActive: boolean;
};

export function CouponFormDialog({ target }: { target?: CouponEditTarget }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [code, setCode] = useState(target?.code ?? "");
  const [type, setType] = useState<CouponType>(target?.type ?? "PERCENTAGE");
  const [value, setValue] = useState(String(target?.value ?? 10));
  const [appliesTo, setAppliesTo] = useState<CouponAppliesTo>(target?.appliesTo ?? "ALL");
  const [minSubtotal, setMinSubtotal] = useState(String((target?.minSubtotalCents ?? 0) / 100));
  const [maxRedemptions, setMaxRedemptions] = useState(target?.maxRedemptions ? String(target.maxRedemptions) : "");
  const [isActive, setIsActive] = useState(target?.isActive ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length < 3) {
      toast.error("Code must be at least 3 characters.");
      return;
    }
    setPending(true);
    try {
      const body = JSON.stringify({
        code,
        type,
        value: Number(value),
        appliesTo,
        minSubtotalCents: Math.round(Number(minSubtotal) * 100) || 0,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
        isActive,
      });
      if (target) {
        await apiFetch(`/api/admin/coupons/${target.id}`, { method: "PATCH", body });
      } else {
        await apiFetch("/api/admin/coupons", { method: "POST", body });
        setCode("");
        setType("PERCENTAGE");
        setValue("10");
        setAppliesTo("ALL");
        setMinSubtotal("0");
        setMaxRedemptions("");
        setIsActive(true);
      }
      toast.success(target ? "Coupon updated" : "Coupon created");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {target ? (
          <Button size="sm" variant="ghost">
            <Pencil /> Edit
          </Button>
        ) : (
          <Button size="sm">
            <Plus /> Add coupon
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{target ? "Edit coupon" : "New coupon"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cpn-code">Code</Label>
            <Input id="cpn-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as CouponType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage off</SelectItem>
                  <SelectItem value="FIXED">Fixed amount off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cpn-value">{type === "PERCENTAGE" ? "Value (%)" : "Value ($)"}</Label>
              <Input id="cpn-value" type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Applies to</Label>
            <Select value={appliesTo} onValueChange={(v) => setAppliesTo(v as CouponAppliesTo)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Entire order</SelectItem>
                <SelectItem value="CATEGORY">A category</SelectItem>
                <SelectItem value="FONT">A specific font</SelectItem>
                <SelectItem value="DESIGNER">A designer&rsquo;s fonts</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="cpn-min">Minimum subtotal ($)</Label>
              <Input id="cpn-min" type="number" min={0} value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cpn-max">Max redemptions</Label>
              <Input
                id="cpn-max"
                type="number"
                min={1}
                placeholder="Unlimited"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="cpn-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="cpn-active">Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {target ? "Save changes" : "Create coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
