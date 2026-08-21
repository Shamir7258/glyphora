import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { commissionUpdateSchema } from "@/types/schemas/admin.schema";
import { CommissionService } from "@/server/services/commission.service";
import { writeAuditLog } from "@/server/lib/audit";
import { getClientIp } from "@/server/lib/rate-limit";

export const GET = withApiHandler(async () => {
  await requireAdmin();
  const [current, history] = await Promise.all([
    CommissionService.getEffectivePercentage(),
    CommissionService.history(),
  ]);
  return apiOk({ currentPercentage: current, history });
});

// Always appends a new versioned row — never edits an existing CommissionConfig
// document (spec §22, docs/ARCHITECTURE.md §7). This is what keeps historical
// OrderItem/Transaction commission snapshots honest.
export const POST = withApiHandler(async (request: Request) => {
  const session = await requireAdmin();
  const body = await request.json();
  const input = commissionUpdateSchema.parse(body);

  const previousPercentage = await CommissionService.getEffectivePercentage();
  const config = await CommissionService.createConfig(input.percentage, session.user.id, input.note);

  await writeAuditLog({
    actorId: session.user.id,
    action: "COMMISSION_CONFIG_CREATE",
    entityType: "CommissionConfig",
    entityId: config._id.toString(),
    before: { percentage: previousPercentage },
    after: { percentage: config.percentage, effectiveFrom: config.effectiveFrom, note: config.note ?? null },
    ip: getClientIp(request),
  });

  return apiOk({ id: config._id.toString(), percentage: config.percentage, effectiveFrom: config.effectiveFrom }, 201);
});
