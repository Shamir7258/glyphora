import { NextResponse, type NextRequest } from "next/server";
import { withApiHandler } from "@/types/api";
import { OrderRepository } from "@/server/repositories/order.repository";
import { DownloadService } from "@/server/services/storage/download.service";
import { requireSession } from "@/server/lib/session";
import { getClientIp } from "@/server/lib/rate-limit";
import { ApiError } from "@/types/errors";

// Not JSON on success (docs/API_CONTRACTS.md) — a 307 redirect straight to the
// signed download URL (docs/ARCHITECTURE.md §6). withApiHandler still gives us
// consistent JSON error shaping if anything before the redirect throws.
export const GET = withApiHandler(
  async (request: NextRequest, ctx: { params: Promise<{ orderItemId: string }> }) => {
    const { orderItemId } = await ctx.params;
    const session = await requireSession();

    const requestedFileId = new URL(request.url).searchParams.get("file");
    const files = await OrderRepository.listDeliverableFilesForOrderItem(orderItemId);
    if (files.length === 0) throw ApiError.notFound("No downloadable file is available for this purchase.");
    const file = requestedFileId ? files.find((f) => f.id === requestedFileId) : files[0];
    if (!file) throw ApiError.notFound("That file isn't part of this purchase.");

    const signedUrl = await DownloadService.authorizeAndIssue({
      userId: session.user.id,
      orderItemId,
      fontFileId: file.id,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.redirect(signedUrl, 307);
  }
);
