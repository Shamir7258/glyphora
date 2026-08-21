import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateFontFile } from "@/server/services/storage/font-file.service";

const FONTS_DIR = path.join(process.cwd(), "scripts", "seed-assets", "fonts");

describe("validateFontFile", () => {
  it("accepts a real TTF file declared as TTF", async () => {
    const buffer = await readFile(path.join(FONTS_DIR, "space-mono.ttf"));
    const result = await validateFontFile(buffer, "TTF");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.glyphCount).toBeGreaterThan(0);
      expect(result.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(result.fileSizeBytes).toBe(buffer.byteLength);
    }
  });

  it("also accepts a real TTF file declared as OTF (both share the sfnt wrapper)", async () => {
    const buffer = await readFile(path.join(FONTS_DIR, "space-mono.ttf"));
    const result = await validateFontFile(buffer, "OTF");
    expect(result.valid).toBe(true);
  });

  it("rejects a WOFF2 claim for a plain TTF file — magic bytes don't match", async () => {
    const buffer = await readFile(path.join(FONTS_DIR, "space-mono.ttf"));
    const result = await validateFontFile(buffer, "WOFF2");
    expect(result.valid).toBe(false);
  });

  it("rejects a non-font file regardless of declared format — never trusts the client's claim", async () => {
    const notAFont = Buffer.from("<html><body>this is not a font</body></html>");
    const result = await validateFontFile(notAFont, "TTF");
    expect(result.valid).toBe(false);
  });

  it("rejects an empty file", async () => {
    const result = await validateFontFile(Buffer.alloc(0), "TTF");
    expect(result.valid).toBe(false);
  });

  it("rejects a file over the size limit", async () => {
    const oversized = Buffer.alloc(21 * 1024 * 1024); // > 20MB limit
    const result = await validateFontFile(oversized, "TTF");
    expect(result.valid).toBe(false);
  });

  it("rejects a corrupted font (magic bytes present, structure broken)", async () => {
    const buffer = await readFile(path.join(FONTS_DIR, "space-mono.ttf"));
    const corrupted = Buffer.from(buffer);
    // Keep the sfnt header intact so magic-byte sniffing still says "ttf", but
    // scramble the table data so opentype.js's actual parse fails.
    corrupted.fill(0, 200, corrupted.length);
    const result = await validateFontFile(corrupted, "TTF");
    expect(result.valid).toBe(false);
  });
});
