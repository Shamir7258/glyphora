"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Download, Heart, LayoutDashboard, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/account", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/account/purchases", label: "Purchases", icon: ShoppingBag },
  { href: "/account/downloads", label: "Downloads", icon: Download },
  { href: "/account/favorites", label: "Favorites", icon: Heart },
  { href: "/account/profile", label: "Profile", icon: User },
  { href: "/account/billing", label: "Billing", icon: CreditCard },
];

export function AccountShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <aside className="lg:w-56 lg:shrink-0">
        <p className="mb-4 truncate text-sm text-muted-foreground">Signed in as {userName}</p>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Account">
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
