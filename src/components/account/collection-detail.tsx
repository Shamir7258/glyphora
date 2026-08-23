"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { FolderHeart, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { apiFetch, ClientApiError } from "@/lib/fetcher";
import type { CollectionDTO } from "@/types/dto";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function CollectionDetail({ collection }: { collection: CollectionDTO }) {
  const router = useRouter();

  const removeFont = useMutation({
    mutationFn: (fontId: string) =>
      apiFetch<CollectionDTO>(`/api/collections/${collection.id}/fonts/${fontId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast("Removed from collection");
      router.refresh();
    },
    onError: (err) => toast.error(err instanceof ClientApiError ? err.message : "Couldn't remove that font."),
  });

  if (collection.fonts.length === 0) {
    return (
      <EmptyState
        icon={FolderHeart}
        title="This collection is empty"
        description="Add fonts to it from your favorites or any font page."
        action={
          <Button asChild size="sm">
            <Link href="/fonts">Browse fonts</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {collection.fonts.map((font) => (
        <div key={font.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
          <div className="min-w-0">
            <Link href={`/fonts/${font.slug}`} className="truncate font-medium hover:underline">
              {font.name}
            </Link>
            <p className="text-sm text-muted-foreground">
              {font.designer.displayName} · {formatPrice(font.basePriceCents, font.currency)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${font.name} from collection`}
            onClick={() => removeFont.mutate(font.id)}
            disabled={removeFont.isPending}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
