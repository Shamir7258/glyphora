import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { adminSuspendSchema } from "@/types/schemas/font.schema";
import { FontModerationService } from "@/server/services/font-moderation.service";
import { writeAuditLog } from "@/server/lib/audit";
import { getClientIp } from "@/server/lib/rate-limit";

export const POST = withApiHandler(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const input = adminSuspendSchema.parse(body);

  const { before, after } = await FontModerationService.suspend(id, input.reason);

  await writeAuditLog({
    actorId: session.user.id,
    action: "FONT_SUSPEND",
    entityType: "Font",
    entityId: id,
    before: { status: before.status },
    after: { status: after.status, reason: input.reason ?? null },
    ip: getClientIp(request),
  });

  return apiOk({ id, status: after.status });
});
