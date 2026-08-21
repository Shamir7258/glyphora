"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Type,
  Users,
  UserCog,
  Receipt,
  Percent,
  Wallet,
  FolderTree,
  Tags,
  FileBadge,
  Ticket,
  Settings,
  ScrollText,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/fonts", label: "Fonts", icon: Type, exact: false },
  { href: "/admin/designers", label: "Designers", icon: UserCog, exact: false },
  { href: "/admin/customers", label: "Customers", icon: Users, exact: false },
  { href: "/admin/orders", label: "Orders", icon: Receipt, exact: false },
  { href: "/admin/commission", label: "Commission", icon: Percent, exact: false },
  { href: "/admin/payouts", label: "Payouts", icon: Wallet, exact: false },
  { href: "/admin/categories", label: "Categories", icon: FolderTree, exact: false },
  { href: "/admin/tags", label: "Tags", icon: Tags, exact: false },
  { href: "/admin/licenses", label: "Licenses", icon: FileBadge, exact: false },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket, exact: false },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: false },
  { href: "/admin/audit-log", label: "Audit log", icon: ScrollText, exact: false },
] as const;

export function AdminSidebar({ adminName, adminEmail }: { adminName: string; adminEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground max-lg:hidden">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-5">
        <span className="font-display text-lg font-semibold tracking-tight">Glyphora</span>
        <span className="rounded-full bg-sidebar-accent px-2 py-0.5 text-[0.65rem] font-medium tracking-wide text-sidebar-accent-foreground uppercase">
          Admin
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {ADMIN_NAV.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="mb-2 flex min-w-0 flex-col px-3">
          <span className="truncate text-sm font-medium">{adminName}</span>
          <span className="truncate text-xs text-sidebar-foreground/60">{adminEmail}</span>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
