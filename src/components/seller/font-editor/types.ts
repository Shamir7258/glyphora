import type { FontFilePurpose, FontFormat, FontStatus } from "@/types/enums";

export type WizardFile = {
  id: string;
  purpose: FontFilePurpose;
  format: FontFormat;
  originalFilename: string;
  fileSizeBytes: number;
  validated: boolean;
  previewUrl: string | null;
};

export type SubmissionChecklist = {
  ready: boolean;
  checks: {
    hasName: boolean;
    hasDescription: boolean;
    hasCategory: boolean;
    hasTags: boolean;
    hasDeliverableFile: boolean;
    hasPreviewFile: boolean;
    hasPrice: boolean;
    hasLicense: boolean;
  };
  missing: string[];
};

/** Mirrors GET /api/seller/fonts/[id]'s response — see that route for the source shape. */
export type FontDraftState = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: FontStatus;
  rejectionReason: string | null;
  categoryId: string | null;
  categoryName: string | null;
  tagIds: string[];
  languages: string[];
  glyphCount: number;
  previewText: string;
  basePriceCents: number;
  currency: string;
  licenseIds: string[];
  files: WizardFile[];
  checklist: SubmissionChecklist;
};

export const CHECK_LABELS: Record<keyof SubmissionChecklist["checks"], string> = {
  hasName: "Name your font",
  hasDescription: "Write a description (at least 20 characters)",
  hasCategory: "Choose a category",
  hasTags: "Add at least one tag",
  hasDeliverableFile: "Upload a deliverable font file",
  hasPreviewFile: "Upload a preview font file",
  hasPrice: "Set a price of at least $1.00",
  hasLicense: "Select at least one license",
};
