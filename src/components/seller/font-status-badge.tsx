import { Badge } from "@/components/ui/badge";
import type { FontStatus } from "@/types/enums";

const STYLES: Record<FontStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  DRAFT: { label: "Draft", variant: "outline" },
  PENDING_REVIEW: { label: "Pending review", variant: "secondary" },
  APPROVED: { label: "Approved", variant: "secondary" },
  PUBLISHED: { label: "Published", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  SUSPENDED: { label: "Suspended", variant: "destructive" },
  ARCHIVED: { label: "Archived", variant: "outline" },
};

export function FontStatusBadge({ status }: { status: FontStatus }) {
  const style = STYLES[status];
  return <Badge variant={style.variant}>{style.label}</Badge>;
}
