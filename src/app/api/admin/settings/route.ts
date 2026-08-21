import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { siteSettingUpdateSchema } from "@/types/schemas/admin.schema";
import { SiteSettingRepository } from "@/server/repositories/site-setting.repository";
import { writeAuditLog } from "@/server/lib/audit";
import { getClientIp } from "@/server/lib/rate-limit";

export const GET = withApiHandler(async () => {
  await requireAdmin();
  const settings = await SiteSettingRepository.listAll();
  return apiOk(settings);
});

export const PATCH = withApiHandler(async (request: Request) => {
  const session = await requireAdmin();
  const body = await request.json();
  const input = siteSettingUpdateSchema.parse(body);

  const { before, after } = await SiteSettingRepository.upsert(input.key, input.value, session.user.id);

  await writeAuditLog({
    actorId: session.user.id,
    action: "SITE_SETTING_UPDATE",
    entityType: "SiteSetting",
    entityId: input.key,
    before: before ? { value: before.value } : null,
    after: { value: after?.value },
    ip: getClientIp(request),
  });

  return apiOk(after);
});
