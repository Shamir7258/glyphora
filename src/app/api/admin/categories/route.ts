import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { categoryUpsertSchema } from "@/types/schemas/admin.schema";
import { AdminCategoryRepository } from "@/server/repositories/admin-catalog.repository";
import { writeAuditLog } from "@/server/lib/audit";
import { getClientIp } from "@/server/lib/rate-limit";

export const GET = withApiHandler(async () => {
  await requireAdmin();
  const categories = await AdminCategoryRepository.list();
  return apiOk(categories);
});

export const POST = withApiHandler(async (request: Request) => {
  const session = await requireAdmin();
  const body = await request.json();
  const input = categoryUpsertSchema.parse(body);

  const category = await AdminCategoryRepository.create(input);

  await writeAuditLog({
    actorId: session.user.id,
    action: "CATEGORY_CREATE",
    entityType: "Category",
    entityId: category._id.toString(),
    before: null,
    after: category.toObject(),
    ip: getClientIp(request),
  });

  return apiOk(category, 201);
});
