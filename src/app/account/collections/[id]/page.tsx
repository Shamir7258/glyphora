import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { CollectionDetail } from "@/components/account/collection-detail";
import { CollectionRepository } from "@/server/repositories/collection.repository";
import { requireSession } from "@/server/lib/session";

export const metadata: Metadata = { title: "Collection" };

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  let collection;
  try {
    collection = await CollectionRepository.getDetailForUser(id, session.user.id);
  } catch {
    notFound();
  }

  return (
    <div>
      <Link href="/account/collections" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Collections
      </Link>
      <h1 className="mb-1 font-display text-2xl font-medium tracking-tight">{collection.name}</h1>
      {collection.description && <p className="mb-6 text-muted-foreground">{collection.description}</p>}
      <div className="mt-6">
        <CollectionDetail collection={collection} />
      </div>
    </div>
  );
}
