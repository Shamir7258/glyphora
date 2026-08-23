import type { NextRequest } from "next/server";
import { apiOk, withApiHandler } from "@/types/api";
import { requireDesignerProfileId } from "@/server/lib/session";
import { registerFileSchema } from "@/types/schemas/font.schema";
import { FontPublishingService } from "@/server/services/font-publishing.service";

/**
 * POST /api/seller/fonts/[id]/files — registers a FontFile for a storageKey the
 * client already PUT the bytes to, then server-side validates it (magic bytes +
 * opentype.js parse — see FontFileService.validateUploadedObject). A font that
 * fails validation is deleted from storage and returns 400 VALIDATION_ERROR;
 * the client must not advance past the Files step until this succeeds.
 */
export const POST = withApiHandler(async (request: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { designerProfileId, session } = await requireDesignerProfileId();
  const body = await request.json();
  const input = registerFileSchema.parse(body);

  const { file, validation } = await FontPublishingService.registerFontFile(id, designerProfileId, session.user.id, {
    storageKey: input.storageKey,
    purpose: input.purpose,
    format: input.format,
    variantId: input.variantId,
    originalFilename: input.originalFilename,
  });

  return apiOk(
    {
      id: file._id.toString(),
      purpose: file.purpose,
      format: file.format,
      originalFilename: file.originalFilename,
      validated: file.validated,
      validation: { glyphCount: validation.valid ? validation.glyphCount : null, familyName: validation.valid ? validation.familyName : null },
    },
    201
  );
});
