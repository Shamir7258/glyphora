"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { TagKind } from "@/types/enums";

export type TagEditTarget = { id: string; name: string; kind: TagKind };

export function TagFormDialog({ target }: { target?: TagEditTarget }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(target?.name ?? "");
  const [kind, setKind] = useState<TagKind>(target?.kind ?? "MOOD");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Name must be at least 2 characters.");
      return;
    }
    setPending(true);
    try {
      const body = JSON.stringify({ name, kind });
      if (target) {
        await apiFetch(`/api/admin/tags/${target.id}`, { method: "PATCH", body });
      } else {
        await apiFetch("/api/admin/tags", { method: "POST", body });
        setName("");
        setKind("MOOD");
      }
      toast.success(target ? "Tag updated" : "Tag created");
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
            <Plus /> Add tag
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{target ? "Edit tag" : "New tag"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="tag-name">Name</Label>
            <Input id="tag-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as TagKind)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MOOD">Mood / descriptor</SelectItem>
                <SelectItem value="CATEGORY_STYLE">Category style</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {target ? "Save changes" : "Create tag"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
