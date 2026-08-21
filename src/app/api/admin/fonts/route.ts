import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { requireAdmin } from "@/server/lib/session";
import { AdminFontRepository } from "@/server/repositories/admin-font.repository";
import { FONT_STATUS } from "@/types/enums";
import type { FontStatus } from "@/types/enums";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status = statusParam && (FONT_STATUS as readonly string[]).includes(statusParam) ? (statusParam as FontStatus) : undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 20);
  const q = searchParams.get("q") ?? undefined;

  const result = await AdminFontRepository.list({ status, page, limit, q });
  return apiOk(result);
});
