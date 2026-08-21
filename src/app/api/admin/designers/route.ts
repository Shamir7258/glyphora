import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { AdminUserRepository } from "@/server/repositories/admin-user.repository";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 20);
  const q = searchParams.get("q") ?? undefined;

  const result = await AdminUserRepository.listDesigners({ page, limit, q });
  return apiOk(result);
});
