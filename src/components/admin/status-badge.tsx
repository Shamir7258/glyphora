import { cn } from "@/lib/utils";

// Semantic status coloring built entirely from theme tokens (primary/accent/
// destructive/muted/secondary) rather than raw Tailwind hues — keeps the "single
// accent, no gradients" design system intact (docs/DEVELOPMENT.md) while still
// giving the moderation queue/orders/payouts tables a scannable at-a-glance state.
type Tone = "success" | "pending" | "danger" | "neutral" | "info";

const STATUS_TONE: Record<string, Tone> = {
  DRAFT: "neutral",
  PENDING_REVIEW: "pending",
  APPROVED: "info",
  PUBLISHED: "success",
  REJECTED: "danger",
  SUSPENDED: "danger",
  ARCHIVED: "neutral",
  PENDING: "pending",
  PAID: "success",
  FAILED: "danger",
  REFUNDED: "info",
  CANCELLED: "neutral",
  REQUESTED: "pending",
  PROCESSING: "info",
  REJECTED_PAYOUT: "danger",
  ACTIVE: "success",
  SUSPENDED_ACCOUNT: "danger",
};

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-primary/15 text-primary",
  pending: "bg-accent text-accent-foreground",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
  info: "bg-secondary text-secondary-foreground",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap capitalize",
        TONE_CLASS[tone],
        className
      )}
    >
      {status.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}
