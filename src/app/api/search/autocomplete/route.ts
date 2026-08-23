import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { searchProvider } from "@/server/services/search";

export const GET = withApiHandler(async (request: NextRequest) => {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const suggestions = await searchProvider.autocomplete(q);
  return apiOk(suggestions);
});
