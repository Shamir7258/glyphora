import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/server/lib/session";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await requireSession();

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-medium tracking-tight">Profile</h1>

      <div className="max-w-lg rounded-xl border border-border bg-card p-6">
        <dl className="flex flex-col gap-4">
          <div>
            <dt className="text-xs text-muted-foreground">Name</dt>
            <dd className="mt-0.5 font-medium">{session.user.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="mt-0.5 font-medium">{session.user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Account type</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {session.user.roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role.charAt(0) + role.slice(1).toLowerCase()}
                </Badge>
              ))}
            </dd>
          </div>
        </dl>

        {!session.user.roles.includes("DESIGNER") && (
          <div className="mt-6 border-t border-border/70 pt-5">
            <p className="text-sm text-muted-foreground">Want to sell your own fonts on Glyphora?</p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/designer-register">Become a designer</Link>
            </Button>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Profile editing (name, avatar, password) isn&apos;t available in this V1 — contact support if you need to
        change your account details.
      </p>
    </div>
  );
}
