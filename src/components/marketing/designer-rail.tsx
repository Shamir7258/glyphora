import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DesignerSummaryDTO } from "@/types/dto";

export function DesignerRail({ designers }: { designers: DesignerSummaryDTO[] }) {
  if (designers.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">Featured designers</h2>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {designers.map((d) => (
          <Link
            key={d.id}
            href={`/designers/${d.username}`}
            className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center transition-colors hover:border-primary/40 hover:bg-accent"
          >
            <Avatar className="size-14">
              <AvatarImage src={d.avatarUrl} alt="" />
              <AvatarFallback>{d.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{d.displayName}</p>
              <p className="text-xs text-muted-foreground">@{d.username}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
