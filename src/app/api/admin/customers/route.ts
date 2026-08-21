import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { AdminUserRepository } from "@/server/repositories/admin-user.repository";

// Not in API_CONTRACTS.md (the contract only lists /api/admin/designers) — added
// to back the customers/page.tsx the task brief asks for. Noted as a contract
// addition in docs/agent-reports/admin-panel.md.
export const GET = withApiHandler(async (request: NextRequest) => {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 20);
  const q = searchParams.get("q") ?? undefined;

  const result = await AdminUserRepository.listCustomers({ page, limit, q });
  return apiOk(result);
});
