import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/lib/session";
import { DesignerRegisterForm } from "@/components/auth/designer-register-form";

export const metadata: Metadata = { title: "Become a Designer" };

/**
 * This route group has no shared layout file (see docs/DEVELOPMENT.md's tree —
 * (auth)/ isn't listed with a layout.tsx), so this page brings its own minimal
 * chrome rather than assuming one exists. If the customer-storefront agent adds
 * a shared (auth) layout later, this page still renders correctly nested inside it.
 */
export default async function DesignerRegisterPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login?callbackUrl=/designer-register");
  }
  if (session.user.designerProfileId) {
    redirect("/seller/dashboard");
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 block text-center font-display text-2xl tracking-tight">
          Glyphora
        </Link>

        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <h1 className="font-display text-2xl tracking-tight">Become a designer</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Set up your public storefront profile. You can start uploading fonts as soon as you&apos;re done.
          </p>

          <div className="mt-6">
            <DesignerRegisterForm defaultDisplayName={session.user.name ?? ""} />
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Changed your mind?{" "}
          <Link href="/" className="text-foreground underline underline-offset-4">
            Back to Glyphora
          </Link>
        </p>
      </div>
    </div>
  );
}
