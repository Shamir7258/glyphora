import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { licenseUpsertSchema } from "@/types/schemas/admin.schema";
import { AdminLicenseRepository } from "@/server/repositories/admin-catalog.repository";
import { writeAuditLog } from "@/server/lib/audit";
import { getClientIp } from "@/server/lib/rate-limit";
import { ApiError } from "@/types/errors";

export const PATCH = withApiHandler(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  const body = await request.json();
  const input = licenseUpsertSchema.parse(body);

  const result = await AdminLicenseRepository.update(id, input);
  if (!result) throw ApiError.notFound("License not found.");

  await writeAuditLog({
    actorId: session.user.id,
    action: "LICENSE_UPDATE",
    entityType: "FontLicense",
    entityId: id,
    before: result.before,
    after: result.after,
    ip: getClientIp(request),
  });

  return apiOk(result.after);
});
