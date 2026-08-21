import { createHash } from "node:crypto";
import * as opentype from "opentype.js";
import { StorageService } from "@/server/services/storage/storage.service";
import type { FontFormat } from "@/types/enums";

// `file-type` is ESM-only (no CJS entry point). A static top-level import breaks
// under tsx's CJS-transpiled script mode (used by scripts/seed.ts) even though it
// works fine bundled into the Next.js app — dynamic import() sidesteps that
// resolution path in both contexts.
async function fileTypeFromBuffer(buffer: Buffer) {
  const mod = await import("file-type");
  return mod.fileTypeFromBuffer(buffer);
}

const MAX_FONT_FILE_BYTES = 20 * 1024 * 1024; // 20MB — generous for variable/CJK fonts

// file-type's sniffed extension per our declared format. WOFF/WOFF2 are detected
// reliably by magic bytes; bare OTF/TTF share the sfnt wrapper and file-type
// reports them as "ttf" for both — we disambiguate by parsing with opentype.js.
const MAGIC_BYTE_EXTENSIONS: Record<FontFormat, string[]> = {
  OTF: ["ttf", "otf"],
  TTF: ["ttf", "otf"],
  WOFF: ["woff"],
  WOFF2: ["woff2"],
};

export type FontFileValidationResult =
  | {
      valid: true;
      checksumSha256: string;
      fileSizeBytes: number;
      glyphCount: number;
      unitsPerEm: number;
      familyName: string | null;
    }
  | { valid: false; reason: string };

/**
 * Never trust a client-declared MIME type or file extension (spec §36). We
 * re-derive the real type from magic bytes and, for OTF/TTF/WOFF/WOFF2, parse the
 * font itself with opentype.js — a corrupt or non-font file throws there, which we
 * treat as a validation failure rather than a 500.
 */
export async function validateFontFile(
  buffer: Buffer,
  declaredFormat: FontFormat
): Promise<FontFileValidationResult> {
  if (buffer.byteLength === 0) return { valid: false, reason: "The uploaded file is empty." };
  if (buffer.byteLength > MAX_FONT_FILE_BYTES) {
    return { valid: false, reason: `File exceeds the ${MAX_FONT_FILE_BYTES / 1024 / 1024}MB limit.` };
  }

  const sniffed = await fileTypeFromBuffer(buffer);
  const allowedExts = MAGIC_BYTE_EXTENSIONS[declaredFormat];
  if (!sniffed || !allowedExts.includes(sniffed.ext)) {
    return {
      valid: false,
      reason: `File content doesn't match a ${declaredFormat} font (detected: ${sniffed?.ext ?? "unknown"}).`,
    };
  }

  try {
    const font = opentype.parse(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    );
    const glyphCount = font.glyphs.length;
    const familyName = font.names?.fontFamily?.en ?? null;
    return {
      valid: true,
      checksumSha256: createHash("sha256").update(buffer).digest("hex"),
      fileSizeBytes: buffer.byteLength,
      glyphCount,
      unitsPerEm: font.unitsPerEm,
      familyName,
    };
  } catch {
    return { valid: false, reason: "The file isn't a readable font (it may be corrupted)." };
  }
}

/**
 * Fetches an uploaded object back from storage for server-side validation. Used
 * right after the client's presigned-PUT upload completes — see
 * POST /api/seller/fonts/[id]/files in docs/API_CONTRACTS.md.
 */
export const FontFileService = {
  async validateUploadedObject(bucket: "previews" | "deliverables", storageKey: string, format: FontFormat) {
    const buffer = await StorageService.getObjectBuffer(bucket, storageKey);
    return validateFontFile(buffer, format);
  },
};
