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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiFetch, ClientApiError } from "@/lib/fetcher";

export type CategoryEditTarget = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
};

export function CategoryFormDialog({ target }: { target?: CategoryEditTarget }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(target?.name ?? "");
  const [description, setDescription] = useState(target?.description ?? "");
  const [icon, setIcon] = useState(target?.icon ?? "");
  const [sortOrder, setSortOrder] = useState(String(target?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(target?.isActive ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Name must be at least 2 characters.");
      return;
    }
    setPending(true);
    try {
      const body = JSON.stringify({
        name,
        description: description || undefined,
        icon: icon || undefined,
        sortOrder: Number(sortOrder) || 0,
        isActive,
      });
      if (target) {
        await apiFetch(`/api/admin/categories/${target.id}`, { method: "PATCH", body });
      } else {
        await apiFetch("/api/admin/categories", { method: "POST", body });
        setName("");
        setDescription("");
        setIcon("");
        setSortOrder("0");
        setIsActive(true);
      }
      toast.success(target ? "Category updated" : "Category created");
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
            <Plus /> Add category
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{target ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cat-description">Description</Label>
            <Textarea id="cat-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="cat-icon">Icon (lucide name)</Label>
              <Input id="cat-icon" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="type" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-sort">Sort order</Label>
              <Input id="cat-sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="cat-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="cat-active">Active (visible to customers)</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {target ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
