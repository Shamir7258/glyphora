import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/lib/session";
import { ApiError } from "@/types/errors";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";

// The real security boundary for every /admin/** page — proxy.ts already redirects
// signed-out/under-privileged users at the edge, but that's a UX nicety only (see
// docs/ARCHITECTURE.md §5). requireAdmin() throws ApiError; a Server Component
// can't return a JSON error response the way a route handler does, so we translate
// UNAUTHORIZED -> /login and FORBIDDEN -> / here rather than letting it surface as
// a raw 500 via error.tsx.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  let session;
  try {
    session = await requireAdmin();
  } catch (err) {
    if (err instanceof ApiError && err.code === "UNAUTHORIZED") {
      redirect("/login?callbackUrl=/admin");
    }
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar adminName={session.user.name ?? "Admin"} adminEmail={session.user.email ?? ""} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileNav />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
