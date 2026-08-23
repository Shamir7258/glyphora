import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SellerNav } from "@/components/seller/seller-nav";
import { getSession, requireDesignerProfileId } from "@/server/lib/session";
import { ApiError } from "@/types/errors";

/**
 * DESIGNER-gated shell for /seller/**. src/proxy.ts already redirects
 * signed-out/wrong-role visitors at the edge, but per docs/ARCHITECTURE.md §5
 * that's a UX guard only — this layout (and every route handler under
 * /api/seller/**) independently calls requireDesignerProfileId(), the real
 * security boundary. It throws if the session has no linked DesignerProfile
 * (e.g. an ADMIN account that never became a designer), which we turn into a
 * friendly redirect to /designer-register rather than an error page.
 */
export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login?callbackUrl=/seller/dashboard");
  }

  try {
    await requireDesignerProfileId();
  } catch (err) {
    if (err instanceof ApiError) {
      redirect("/designer-register");
    }
    throw err;
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/seller/dashboard" className="font-display text-xl tracking-tight">
              Glyphora <span className="text-muted-foreground">Studio</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">Back to Glyphora</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/seller/fonts/new">Upload a font</Link>
            </Button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6">
          <SellerNav />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
