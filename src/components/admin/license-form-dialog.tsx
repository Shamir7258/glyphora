"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

export type LicenseEditTarget = {
  id: string;
  key: string;
  name: string;
  description: string;
  priceMultiplier: number;
  allowedUsage: string[];
  restrictions: string[];
  isActive: boolean;
  sortOrder: number;
};

function linesToList(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function LicenseFormDialog({ target }: { target?: LicenseEditTarget }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [key, setKey] = useState(target?.key ?? "");
  const [name, setName] = useState(target?.name ?? "");
  const [description, setDescription] = useState(target?.description ?? "");
  const [priceMultiplier, setPriceMultiplier] = useState(String(target?.priceMultiplier ?? 1));
  const [allowedUsage, setAllowedUsage] = useState((target?.allowedUsage ?? []).join("\n"));
  const [restrictions, setRestrictions] = useState((target?.restrictions ?? []).join("\n"));
  const [sortOrder, setSortOrder] = useState(String(target?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(target?.isActive ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const usageList = linesToList(allowedUsage);
    if (key.trim().length < 2 || name.trim().length < 2 || description.trim().length < 10 || usageList.length === 0) {
      toast.error("Fill in key, name, a description (min 10 chars), and at least one allowed use.");
      return;
    }
    setPending(true);
    try {
      const body = JSON.stringify({
        key,
        name,
        description,
        priceMultiplier: Number(priceMultiplier),
        allowedUsage: usageList,
        restrictions: linesToList(restrictions),
        sortOrder: Number(sortOrder) || 0,
        isActive,
      });
      if (target) {
        await apiFetch(`/api/admin/licenses/${target.id}`, { method: "PATCH", body });
      } else {
        await apiFetch("/api/admin/licenses", { method: "POST", body });
        setKey("");
        setName("");
        setDescription("");
        setPriceMultiplier("1");
        setAllowedUsage("");
        setRestrictions("");
        setSortOrder("0");
        setIsActive(true);
      }
      toast.success(target ? "License updated" : "License created");
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
            <Plus /> Add license
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{target ? "Edit license" : "New license"}</DialogTitle>
          <DialogDescription>Price multiplier applies to each font&rsquo;s base price at checkout.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="lic-key">Key</Label>
              <Input id="lic-key" value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} disabled={!!target} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lic-multiplier">Price multiplier</Label>
              <Input
                id="lic-multiplier"
                type="number"
                step={0.1}
                min={0.1}
                value={priceMultiplier}
                onChange={(e) => setPriceMultiplier(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lic-name">Name</Label>
            <Input id="lic-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lic-description">Description</Label>
            <Textarea id="lic-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lic-usage">Allowed usage (one per line)</Label>
            <Textarea id="lic-usage" value={allowedUsage} onChange={(e) => setAllowedUsage(e.target.value)} rows={3} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lic-restrictions">Restrictions (one per line)</Label>
            <Textarea id="lic-restrictions" value={restrictions} onChange={(e) => setRestrictions(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 items-end gap-3">
            <div className="grid gap-2">
              <Label htmlFor="lic-sort">Sort order</Label>
              <Input id="lic-sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pb-1.5">
              <Switch id="lic-active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="lic-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {target ? "Save changes" : "Create license"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
