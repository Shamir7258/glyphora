import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { couponUpsertSchema } from "@/types/schemas/admin.schema";
import { AdminCouponRepository } from "@/server/repositories/admin-catalog.repository";
import { writeAuditLog } from "@/server/lib/audit";
import { getClientIp } from "@/server/lib/rate-limit";

export const GET = withApiHandler(async () => {
  await requireAdmin();
  const coupons = await AdminCouponRepository.list();
  return apiOk(coupons);
});

export const POST = withApiHandler(async (request: Request) => {
  const session = await requireAdmin();
  const body = await request.json();
  const input = couponUpsertSchema.parse(body);

  const coupon = await AdminCouponRepository.create(input);

  await writeAuditLog({
    actorId: session.user.id,
    action: "COUPON_CREATE",
    entityType: "Coupon",
    entityId: coupon._id.toString(),
    before: null,
    after: coupon.toObject(),
    ip: getClientIp(request),
  });

  return apiOk(coupon, 201);
});
