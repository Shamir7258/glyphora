import type { Metadata } from "next";
import Link from "next/link";
import { FolderHeart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { CreateCollectionForm } from "@/components/account/create-collection-form";
import { CollectionRepository } from "@/server/repositories/collection.repository";
import { requireSession } from "@/server/lib/session";

export const metadata: Metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const session = await requireSession();
  const collections = await CollectionRepository.listForUser(session.user.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium tracking-tight">Collections</h1>
        <CreateCollectionForm />
      </div>

      {collections.length === 0 ? (
        <EmptyState
          icon={FolderHeart}
          title="No collections yet"
          description="Group favorite fonts into named collections, like &ldquo;Logo fonts&rdquo; or &ldquo;Wedding suite&rdquo;."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {collections.map((c) => (
            <Link
              key={c.id}
              href={`/account/collections/${c.id}`}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{c.name}</p>
                  {c.description && <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>}
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {c.fonts.length} fonts
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
