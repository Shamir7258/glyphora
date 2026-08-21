import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { FontModerationService } from "@/server/services/font-moderation.service";
import { writeAuditLog } from "@/server/lib/audit";
import { getClientIp } from "@/server/lib/rate-limit";

// Admin manual publish for third-party designer fonts already APPROVED — see
// docs/DEVELOPMENT.md "Approve vs. Publish" (admin may trigger this from the same
// review page; the designer's own equivalent action, if built, is a separate
// caller of the identical transition).
export const POST = withApiHandler(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;

  const { before, after } = await FontModerationService.publish(id, session.user.id);

  await writeAuditLog({
    actorId: session.user.id,
    action: "FONT_PUBLISH",
    entityType: "Font",
    entityId: id,
    before: { status: before.status },
    after: { status: after.status, publishedAt: after.publishedAt },
    ip: getClientIp(request),
  });

  return apiOk({ id, status: after.status });
});
