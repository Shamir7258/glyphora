"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiFetch, ClientApiError } from "@/lib/fetcher";
import type { CollectionDTO } from "@/types/dto";

export function CreateCollectionForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const create = useMutation({
    mutationFn: () => apiFetch<CollectionDTO>("/api/collections", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: (collection) => {
      toast.success("Collection created");
      setOpen(false);
      setName("");
      router.push(`/account/collections/${collection.id}`);
      router.refresh();
    },
    onError: (err) => toast.error(err instanceof ClientApiError ? err.message : "Couldn't create that collection."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> New collection
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New collection</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Logo fonts"
            aria-label="Collection name"
            autoFocus
          />
          <DialogFooter>
            <Button type="submit" disabled={create.isPending || !name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
