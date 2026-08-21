import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { FontModerationService } from "@/server/services/font-moderation.service";
import { writeAuditLog } from "@/server/lib/audit";
import { getClientIp } from "@/server/lib/rate-limit";

export const POST = withApiHandler(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;

  const { before, after } = await FontModerationService.archive(id);

  await writeAuditLog({
    actorId: session.user.id,
    action: "FONT_ARCHIVE",
    entityType: "Font",
    entityId: id,
    before: { status: before.status },
    after: { status: after.status },
    ip: getClientIp(request),
  });

  return apiOk({ id, status: after.status });
});
