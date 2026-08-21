import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { registerSchema } from "@/types/schemas/auth.schema";
import { AuthService } from "@/server/services/auth.service";
import { rateLimit, getClientIp } from "@/server/lib/rate-limit";

export const POST = withApiHandler(async (request: NextRequest) => {
  rateLimit(`register:${getClientIp(request)}`, 5, 60_000);

  const body = await request.json();
  const input = registerSchema.parse(body);
  const user = await AuthService.register(input);

  return apiOk({ id: user._id.toString(), email: user.email, name: user.name }, 201);
});
