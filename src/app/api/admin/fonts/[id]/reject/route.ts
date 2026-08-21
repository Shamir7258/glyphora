import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { adminRejectSchema } from "@/types/schemas/font.schema";
import { FontModerationService } from "@/server/services/font-moderation.service";
import { writeAuditLog } from "@/server/lib/audit";
import { getClientIp } from "@/server/lib/rate-limit";

export const POST = withApiHandler(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  const body = await request.json();
  const input = adminRejectSchema.parse(body);

  const { before, after } = await FontModerationService.reject(id, session.user.id, input.reason, input.mode);

  await writeAuditLog({
    actorId: session.user.id,
    action: input.mode === "REQUEST_CHANGES" ? "FONT_REQUEST_CHANGES" : "FONT_REJECT",
    entityType: "Font",
    entityId: id,
    before: { status: before.status },
    after: { status: after.status, rejectionReason: after.rejectionReason },
    ip: getClientIp(request),
  });

  return apiOk({ id, status: after.status });
});
