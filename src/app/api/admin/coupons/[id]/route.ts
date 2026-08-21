import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { couponUpsertSchema } from "@/types/schemas/admin.schema";
import { AdminCouponRepository } from "@/server/repositories/admin-catalog.repository";
import { writeAuditLog } from "@/server/lib/audit";
import { getClientIp } from "@/server/lib/rate-limit";
import { ApiError } from "@/types/errors";

export const PATCH = withApiHandler(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  const body = await request.json();
  const input = couponUpsertSchema.parse(body);

  const result = await AdminCouponRepository.update(id, input);
  if (!result) throw ApiError.notFound("Coupon not found.");

  await writeAuditLog({
    actorId: session.user.id,
    action: "COUPON_UPDATE",
    entityType: "Coupon",
    entityId: id,
    before: result.before,
    after: result.after,
    ip: getClientIp(request),
  });

  return apiOk(result.after);
});
