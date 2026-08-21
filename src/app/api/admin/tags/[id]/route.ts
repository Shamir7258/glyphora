import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { tagUpsertSchema } from "@/types/schemas/admin.schema";
import { AdminTagRepository } from "@/server/repositories/admin-catalog.repository";
import { writeAuditLog } from "@/server/lib/audit";
import { getClientIp } from "@/server/lib/rate-limit";
import { ApiError } from "@/types/errors";

export const PATCH = withApiHandler(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  const body = await request.json();
  const input = tagUpsertSchema.parse(body);

  const result = await AdminTagRepository.update(id, input);
  if (!result) throw ApiError.notFound("Tag not found.");

  await writeAuditLog({
    actorId: session.user.id,
    action: "TAG_UPDATE",
    entityType: "Tag",
    entityId: id,
    before: result.before,
    after: result.after,
    ip: getClientIp(request),
  });

  return apiOk(result.after);
});
