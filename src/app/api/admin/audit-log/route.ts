import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { AuditLogRepository } from "@/server/repositories/audit-log.repository";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType") ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 30);

  const result = await AuditLogRepository.list({ entityType, page, limit });
  return apiOk(result);
});
