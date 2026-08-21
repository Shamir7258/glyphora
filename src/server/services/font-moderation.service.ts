import { revalidatePath } from "next/cache";
import { AdminFontRepository } from "@/server/repositories/admin-font.repository";
import { ApiError } from "@/types/errors";
import type { FontStatus } from "@/types/enums";

/**
 * Admin-only font status transitions. Deliberately a separate file from
 * FontPublishingService (src/server/services/font-publishing.service.ts, owned by
 * the designer-upload flow: createDraftFont/submitForReview) so this agent's admin
 * moderation logic never edits a file another parallel agent is also touching.
 *
 * Approve vs. Publish (see docs/DEVELOPMENT.md "Decisions made to keep this
 * unblocked"): APPROVED and PUBLISHED are distinct. Approving a platform
 * (isPlatform) designer's font auto-publishes it immediately, since the platform
 * account is both submitter and approver. Approving a third-party designer's font
 * only sets APPROVED — going live is a separate, explicit "Publish" action. Per the
 * doc, that action may be triggered "by the designer or admin" — this file exposes
 * `publish()` so admin can do it from this same review page; the designer's own
 * publish action (if the designer-experience agent builds one) is a separate call
 * into the same transition, not owned here.
 */

function busPublicPaths(slug: string) {
  revalidatePath("/");
  revalidatePath("/fonts");
  revalidatePath(`/fonts/${slug}`);
}

const TRANSITIONS: Record<string, FontStatus[]> = {
  approve: ["PENDING_REVIEW"],
  reject: ["PENDING_REVIEW"],
  publish: ["APPROVED"],
  suspend: ["APPROVED", "PUBLISHED"],
  archive: ["APPROVED", "PUBLISHED", "SUSPENDED", "REJECTED", "PENDING_REVIEW"],
  reactivate: ["SUSPENDED"],
};

function assertTransition(action: keyof typeof TRANSITIONS, current: FontStatus) {
  if (!TRANSITIONS[action].includes(current)) {
    throw ApiError.conflict(
      `Cannot ${action} a font in status ${current}. Expected one of: ${TRANSITIONS[action].join(", ")}.`
    );
  }
}

export const FontModerationService = {
  /** PENDING_REVIEW -> APPROVED, or -> PUBLISHED (+publishedAt) if the designer is the platform account. */
  async approve(fontId: string, adminUserId: string) {
    const font = await AdminFontRepository.findRaw(fontId);
    if (!font) throw ApiError.notFound("Font not found.");
    assertTransition("approve", font.status as FontStatus);

    const { DesignerProfileModel } = await import("@/server/models/designer-profile.model");
    const designer = await DesignerProfileModel.findById(font.designer).select("isPlatform").lean();
    const before = font.toObject();

    font.status = "APPROVED";
    font.reviewedBy = adminUserId as unknown as typeof font.reviewedBy;
    font.reviewedAt = new Date();
    font.rejectionReason = null;

    let autoPublished = false;
    if (designer?.isPlatform) {
      font.status = "PUBLISHED";
      font.publishedAt = new Date();
      autoPublished = true;
    }

    await font.save();
    if (autoPublished) busPublicPaths(font.slug);

    return { before, after: font.toObject(), autoPublished };
  },

  /** PENDING_REVIEW -> REJECTED. `mode` only changes tone/audit framing, not the stored status (see font.schema.ts). */
  async reject(fontId: string, adminUserId: string, reason: string, mode: "REJECT" | "REQUEST_CHANGES") {
    const font = await AdminFontRepository.findRaw(fontId);
    if (!font) throw ApiError.notFound("Font not found.");
    assertTransition("reject", font.status as FontStatus);

    const before = font.toObject();
    font.status = "REJECTED";
    font.reviewedBy = adminUserId as unknown as typeof font.reviewedBy;
    font.reviewedAt = new Date();
    font.rejectionReason =
      mode === "REQUEST_CHANGES" ? `[Changes requested] ${reason}` : reason;
    await font.save();

    return { before, after: font.toObject() };
  },

  /** APPROVED -> PUBLISHED (+publishedAt). Third-party fonts only — platform fonts auto-publish on approve. */
  async publish(fontId: string, adminUserId: string) {
    const font = await AdminFontRepository.findRaw(fontId);
    if (!font) throw ApiError.notFound("Font not found.");
    assertTransition("publish", font.status as FontStatus);

    const before = font.toObject();
    font.status = "PUBLISHED";
    font.publishedAt = new Date();
    await font.save();
    busPublicPaths(font.slug);
    void adminUserId;

    return { before, after: font.toObject() };
  },

  /** APPROVED|PUBLISHED -> SUSPENDED. Immediately pulls a published font from the storefront. */
  async suspend(fontId: string, reason: string | undefined) {
    const font = await AdminFontRepository.findRaw(fontId);
    if (!font) throw ApiError.notFound("Font not found.");
    assertTransition("suspend", font.status as FontStatus);

    const wasPublished = font.status === "PUBLISHED";
    const before = font.toObject();
    font.status = "SUSPENDED";
    if (reason) font.rejectionReason = `[Suspended] ${reason}`;
    await font.save();
    if (wasPublished) busPublicPaths(font.slug);

    return { before, after: font.toObject() };
  },

  /** SUSPENDED -> APPROVED. Storefront visibility is only restored via an explicit Publish afterward. */
  async reactivate(fontId: string) {
    const font = await AdminFontRepository.findRaw(fontId);
    if (!font) throw ApiError.notFound("Font not found.");
    assertTransition("reactivate", font.status as FontStatus);

    const before = font.toObject();
    font.status = "APPROVED";
    font.rejectionReason = null;
    await font.save();

    return { before, after: font.toObject() };
  },

  /** Any active status -> ARCHIVED. Terminal in V1 (no unarchive UI — matches spec's lifecycle). */
  async archive(fontId: string) {
    const font = await AdminFontRepository.findRaw(fontId);
    if (!font) throw ApiError.notFound("Font not found.");
    assertTransition("archive", font.status as FontStatus);

    const wasPublished = font.status === "PUBLISHED";
    const before = font.toObject();
    font.status = "ARCHIVED";
    await font.save();
    if (wasPublished) busPublicPaths(font.slug);

    return { before, after: font.toObject() };
  },
};
