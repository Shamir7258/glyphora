/**
 * Builds a scoped @font-face declaration for a marketplace font's PREVIEW file, so
 * a font card / detail page can render live text in that typeface without a
 * global stylesheet entry. `id` should be the Font or FontVariant id — it becomes
 * part of the generated font-family name, so every card gets its own isolated
 * @font-face and two different fonts never collide.
 */
export function buildFontFaceCss(id: string, previewFontUrl: string | null): { fontFamily: string; css: string } {
  const fontFamily = `preview-${sanitizeId(id)}`;
  if (!previewFontUrl) return { fontFamily, css: "" };

  const safeUrl = previewFontUrl.replace(/["'\\]/g, "");
  const format = guessFormat(safeUrl);

  const css = `
@font-face {
  font-family: "${fontFamily}";
  src: url("${safeUrl}")${format ? ` format("${format}")` : ""};
  font-display: swap;
}`.trim();

  return { fontFamily, css };
}

function sanitizeId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

function guessFormat(url: string): string | null {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  switch (ext) {
    case "woff2":
      return "woff2";
    case "woff":
      return "woff";
    case "otf":
      return "opentype";
    case "ttf":
      return "truetype";
    default:
      return null;
  }
}

export const DEFAULT_PREVIEW_TEXT = "Type something";

export const PREVIEW_TEXT_PRESETS = [
  "The quick brown fox jumps",
  "YOUR BRAND",
  "Aa Bb Cc 123",
  "Hamburgefonstiv",
];
