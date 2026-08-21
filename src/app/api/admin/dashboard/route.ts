import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { AdminDashboardRepository } from "@/server/repositories/admin-dashboard.repository";

export const GET = withApiHandler(async () => {
  await requireAdmin();
  const summary = await AdminDashboardRepository.getSummary();
  return apiOk(summary);
});
