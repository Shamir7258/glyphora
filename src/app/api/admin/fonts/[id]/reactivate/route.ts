import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { FontModerationService } from "@/server/services/font-moderation.service";
import { writeAuditLog } from "@/server/lib/audit";
import { getClientIp } from "@/server/lib/rate-limit";

// Not in API_CONTRACTS.md — added so a SUSPENDED font isn't a dead end in the
// admin UI. Lands back at APPROVED (not PUBLISHED); an explicit Publish is still
// required to reappear on the storefront, consistent with the Approve/Publish
// split. Noted in docs/agent-reports/admin-panel.md as a contract addition.
export const POST = withApiHandler(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;

  const { before, after } = await FontModerationService.reactivate(id);

  await writeAuditLog({
    actorId: session.user.id,
    action: "FONT_REACTIVATE",
    entityType: "Font",
    entityId: id,
    before: { status: before.status },
    after: { status: after.status },
    ip: getClientIp(request),
  });

  return apiOk({ id, status: after.status });
});
