import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { FontModerationService } from "@/server/services/font-moderation.service";
import { writeAuditLog } from "@/server/lib/audit";
import { getClientIp } from "@/server/lib/rate-limit";

export const POST = withApiHandler(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;

  const { before, after, autoPublished } = await FontModerationService.approve(id, session.user.id);

  await writeAuditLog({
    actorId: session.user.id,
    action: autoPublished ? "FONT_APPROVE_AUTO_PUBLISH" : "FONT_APPROVE",
    entityType: "Font",
    entityId: id,
    before: { status: before.status },
    after: { status: after.status, publishedAt: after.publishedAt ?? null },
    ip: getClientIp(request),
  });

  return apiOk({ id, status: after.status, autoPublished });
});
