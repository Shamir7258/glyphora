import { redirect } from "next/navigation";
import { getSession } from "@/server/lib/session";
import { AccountShell } from "@/components/account/account-shell";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export default async function AccountLayout({ children }: LayoutProps<"/">) {
  // proxy.ts already redirects unauthenticated requests away from /account/** at
  // the edge, but that's a UX guard, not the security boundary (docs/ARCHITECTURE.md
  // §5) — every gated server-rendered page independently checks the session too.
  const session = await getSession();
  if (!session?.user) redirect("/login?callbackUrl=/account");

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <AccountShell userName={session.user.name ?? "Your account"}>{children}</AccountShell>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
