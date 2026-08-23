import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { OrderRepository } from "@/server/repositories/order.repository";
import { requireSession } from "@/server/lib/session";

export const GET = withApiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20) || 20));

  const result = await OrderRepository.listForUser(session.user.id, page, limit);
  return apiOk(result);
});
