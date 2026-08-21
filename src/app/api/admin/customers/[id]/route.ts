import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { accountStatusUpdateSchema } from "@/types/schemas/admin.schema";
import { AdminUserRepository } from "@/server/repositories/admin-user.repository";
import { writeAuditLog } from "@/server/lib/audit";
import { getClientIp } from "@/server/lib/rate-limit";
import { ApiError } from "@/types/errors";

export const PATCH = withApiHandler(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  const body = await request.json();
  const input = accountStatusUpdateSchema.parse(body);

  const result = await AdminUserRepository.setCustomerStatus(id, input.status);
  if (!result) throw ApiError.notFound("Customer not found.");

  await writeAuditLog({
    actorId: session.user.id,
    action: input.status === "SUSPENDED" ? "CUSTOMER_SUSPEND" : "CUSTOMER_REACTIVATE",
    entityType: "User",
    entityId: id,
    before: { status: result.before.status },
    after: { status: result.after?.status },
    ip: getClientIp(request),
  });

  return apiOk({ id, status: result.after?.status });
});
