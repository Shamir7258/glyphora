import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/server/lib/auth";
import { ApiError } from "@/types/errors";
import type { Role } from "@/types/enums";

export async function getSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

/** Throws ApiError.unauthorized() if there's no session. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session?.user) throw ApiError.unauthorized();
  return session;
}

/**
 * Throws ApiError.unauthorized() with no session, or ApiError.forbidden() if the
 * session doesn't carry one of the allowed roles. This — not proxy.ts — is the
 * real security boundary (see docs/ARCHITECTURE.md §5).
 */
export async function requireRole(...allowed: Role[]): Promise<Session> {
  const session = await requireSession();
  const hasRole = session.user.roles.some((r) => allowed.includes(r));
  if (!hasRole) throw ApiError.forbidden();
  return session;
}

export async function requireAdmin(): Promise<Session> {
  return requireRole("ADMIN", "SUPER_ADMIN");
}

/** Designer routes: session must have a linked DesignerProfile. Returns its id. */
export async function requireDesignerProfileId(): Promise<{ session: Session; designerProfileId: string }> {
  const session = await requireRole("DESIGNER", "ADMIN", "SUPER_ADMIN");
  if (!session.user.designerProfileId) {
    throw ApiError.forbidden("Create a designer profile first.");
  }
  return { session, designerProfileId: session.user.designerProfileId };
}

/** Throws ApiError.forbidden() unless the session user id matches ownerId. */
export function requireOwnership(session: Session, ownerId: string) {
  if (session.user.id !== ownerId) throw ApiError.forbidden();
}
