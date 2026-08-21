import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { AdminOrderRepository } from "@/server/repositories/admin-order.repository";
import { ORDER_STATUS } from "@/types/enums";
import type { OrderStatus } from "@/types/enums";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status = statusParam && (ORDER_STATUS as readonly string[]).includes(statusParam) ? (statusParam as OrderStatus) : undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 20);
  const q = searchParams.get("q") ?? undefined;

  const result = await AdminOrderRepository.list({ status, page, limit, q });
  return apiOk(result);
});
