import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { tagUpsertSchema } from "@/types/schemas/admin.schema";
import { AdminTagRepository } from "@/server/repositories/admin-catalog.repository";
import { writeAuditLog } from "@/server/lib/audit";
import { getClientIp } from "@/server/lib/rate-limit";

export const GET = withApiHandler(async () => {
  await requireAdmin();
  const tags = await AdminTagRepository.list();
  return apiOk(tags);
});

export const POST = withApiHandler(async (request: Request) => {
  const session = await requireAdmin();
  const body = await request.json();
  const input = tagUpsertSchema.parse(body);

  const tag = await AdminTagRepository.create(input);

  await writeAuditLog({
    actorId: session.user.id,
    action: "TAG_CREATE",
    entityType: "Tag",
    entityId: tag._id.toString(),
    before: null,
    after: tag.toObject(),
    ip: getClientIp(request),
  });

  return apiOk(tag, 201);
});
