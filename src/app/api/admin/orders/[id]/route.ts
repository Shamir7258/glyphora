import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { AdminOrderRepository } from "@/server/repositories/admin-order.repository";
import { ApiError } from "@/types/errors";

// Not explicitly in API_CONTRACTS.md (which only lists the collection GET) — added
// to back orders/page.tsx's detail view. Noted in docs/agent-reports/admin-panel.md.
export const GET = withApiHandler(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const order = await AdminOrderRepository.getDetail(id);
  if (!order) throw ApiError.notFound("Order not found.");
  return apiOk(order);
});
