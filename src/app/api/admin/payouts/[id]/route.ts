import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { payoutDecisionSchema } from "@/types/schemas/admin.schema";
import { PayoutDecisionService } from "@/server/services/payout-decision.service";
import { writeAuditLog } from "@/server/lib/audit";
import { getClientIp } from "@/server/lib/rate-limit";

export const PATCH = withApiHandler(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  const body = await request.json();
  const input = payoutDecisionSchema.parse(body);

  const { before, after } = await PayoutDecisionService.decide(id, session.user.id, input.status, input.notes);

  await writeAuditLog({
    actorId: session.user.id,
    action: `PAYOUT_${input.status}`,
    entityType: "Payout",
    entityId: id,
    before: { status: before.status },
    after: { status: after.status, notes: after.notes ?? null, transactionCount: after.transactions?.length ?? 0 },
    ip: getClientIp(request),
  });

  return apiOk({ id, status: after.status });
});
