import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { DesignerBrowseCardDTO } from "@/server/repositories/designer.repository";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function DesignerCard({ designer }: { designer: DesignerBrowseCardDTO }) {
  return (
    <Link
      href={`/designers/${designer.username}`}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          <AvatarImage src={designer.avatarUrl} alt="" />
          <AvatarFallback>{initials(designer.displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium group-hover:underline">{designer.displayName}</p>
          <p className="truncate text-sm text-muted-foreground">@{designer.username}</p>
        </div>
      </div>
      {designer.bio && <p className="line-clamp-2 text-sm text-muted-foreground">{designer.bio}</p>}
      <div className="mt-auto flex items-center gap-1.5 pt-1">
        <Badge variant="secondary" className="font-normal">
          {designer.fontCount} {designer.fontCount === 1 ? "font" : "fonts"}
        </Badge>
      </div>
    </Link>
  );
}
