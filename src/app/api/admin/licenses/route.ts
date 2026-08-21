import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { licenseUpsertSchema } from "@/types/schemas/admin.schema";
import { AdminLicenseRepository } from "@/server/repositories/admin-catalog.repository";
import { writeAuditLog } from "@/server/lib/audit";
import { getClientIp } from "@/server/lib/rate-limit";

export const GET = withApiHandler(async () => {
  await requireAdmin();
  const licenses = await AdminLicenseRepository.list();
  return apiOk(licenses);
});

export const POST = withApiHandler(async (request: Request) => {
  const session = await requireAdmin();
  const body = await request.json();
  const input = licenseUpsertSchema.parse(body);

  const license = await AdminLicenseRepository.create(input);

  await writeAuditLog({
    actorId: session.user.id,
    action: "LICENSE_CREATE",
    entityType: "FontLicense",
    entityId: license._id.toString(),
    before: null,
    after: license.toObject(),
    ip: getClientIp(request),
  });

  return apiOk(license, 201);
});
