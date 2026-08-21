import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Consistent "nothing here yet" treatment — spec §38 (empty search, empty cart, no favorites, ...). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center", className)}>
      {Icon && <Icon className="mb-4 size-8 text-muted-foreground" aria-hidden />}
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
