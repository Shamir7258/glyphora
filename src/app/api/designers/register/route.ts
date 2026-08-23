import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { becomeDesignerSchema } from "@/types/schemas/auth.schema";
import { AuthService } from "@/server/services/auth.service";
import { requireSession } from "@/server/lib/session";

/**
 * "Become a designer" — src/app/(auth)/designer-register/page.tsx. Requires an
 * existing signed-in session (the page itself redirects signed-out visitors to
 * /login?callbackUrl=/designer-register before this is ever called).
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  const body = await request.json();
  const input = becomeDesignerSchema.parse(body);

  const profile = await AuthService.becomeDesigner(session.user.id, input);

  return apiOk(
    { id: profile._id.toString(), username: profile.username, displayName: profile.displayName },
    201
  );
});
