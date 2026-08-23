import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { reviewSchema } from "@/types/schemas/checkout.schema";
import { ReviewRepository } from "@/server/repositories/review.repository";
import { requireSession } from "@/server/lib/session";
import { rateLimit, getClientIp } from "@/server/lib/rate-limit";

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  rateLimit(`reviews:${getClientIp(request)}`, 10, 60_000);

  const body = await request.json();
  const input = reviewSchema.parse(body);

  const review = await ReviewRepository.create(session.user.id, input.fontId, input.rating, input.comment);
  return apiOk(review, 201);
});
