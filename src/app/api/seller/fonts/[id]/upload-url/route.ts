import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { requireDesignerProfileId } from "@/server/lib/session";
import { uploadUrlRequestSchema } from "@/types/schemas/font.schema";
import { FontPublishingService } from "@/server/services/font-publishing.service";
import { StorageService, type StorageBucket } from "@/server/services/storage/storage.service";

/**
 * POST /api/seller/fonts/[id]/upload-url — presigned PUT target (see
 * docs/ARCHITECTURE.md §6: the client uploads bytes directly to storage, this
 * server never proxies the file). Works identically for local-disk or real S3/R2
 * — StorageService is the only thing that knows which backend is active.
 */
export const POST = withApiHandler(async (request: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { designerProfileId } = await requireDesignerProfileId();
  const body = await request.json();
  const input = uploadUrlRequestSchema.parse(body);

  // Ownership + DRAFT/REJECTED status check — same rule as every other wizard mutation.
  await FontPublishingService.assertEditableDraft(id, designerProfileId);

  const bucket: StorageBucket = input.purpose === "PREVIEW" ? "previews" : "deliverables";
  const contentType = CONTENT_TYPES[input.format];
  const { uploadUrl, storageKey } = await StorageService.getUploadUrl(bucket, input.filename, contentType);

  return apiOk({ uploadUrl, storageKey });
});

const CONTENT_TYPES: Record<string, string> = {
  OTF: "font/otf",
  TTF: "font/ttf",
  WOFF: "font/woff",
  WOFF2: "font/woff2",
};
