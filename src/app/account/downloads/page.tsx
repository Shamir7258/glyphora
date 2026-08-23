import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { OrderRepository } from "@/server/repositories/order.repository";
import { requireSession } from "@/server/lib/session";

export const metadata: Metadata = { title: "Downloads" };

export default async function DownloadsPage() {
  const session = await requireSession();
  const items = await OrderRepository.listPurchasedItemsForUser(session.user.id);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-medium tracking-tight">Downloads</h1>

      {items.length === 0 ? (
        <EmptyState
          icon={Download}
          title="Nothing to download yet"
          description="Once you purchase a font, its files will be available here."
          action={
            <Button asChild size="sm">
              <Link href="/fonts">Browse fonts</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.orderItemId} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
              <div className="min-w-0">
                <Link href={`/fonts/${item.font.slug}`} className="truncate font-medium hover:underline">
                  {item.font.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  Order {item.orderNumber} · {new Date(item.purchasedAt).toLocaleDateString()} ·{" "}
                  {item.files.map((f) => f.format).join(", ") || "no files"}
                </p>
              </div>
              {item.files.length > 0 ? (
                <Button asChild size="sm">
                  <a href={`/api/downloads/${item.orderItemId}`}>
                    <Download className="size-3.5" /> Download
                  </a>
                </Button>
              ) : (
                <Button size="sm" disabled>
                  <Download className="size-3.5" /> Unavailable
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
