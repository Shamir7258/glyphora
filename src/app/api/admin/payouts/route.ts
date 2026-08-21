import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { AdminPayoutRepository } from "@/server/repositories/admin-payout.repository";
import { PAYOUT_STATUS } from "@/types/enums";
import type { PayoutStatus } from "@/types/enums";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status = statusParam && (PAYOUT_STATUS as readonly string[]).includes(statusParam) ? (statusParam as PayoutStatus) : undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 20);

  const result = await AdminPayoutRepository.list({ status, page, limit });
  return apiOk(result);
});
