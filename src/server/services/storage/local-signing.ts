import { createHmac, timingSafeEqual } from "node:crypto";

// Signs short-lived tokens for the local-disk storage provider's upload/download
// routes, mirroring what a real S3 presigned URL guarantees (time-boxed, tamper-
// proof, single-purpose) without needing real cloud credentials for local dev —
// see docs/DEVELOPMENT.md and storage.service.ts.
function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET must be set to use local storage signing.");
  return s;
}

export type LocalStorageAction = "upload" | "download";

export function signLocalStorageToken(params: {
  action: LocalStorageAction;
  bucket: string;
  key: string;
  expiresAt: number;
}): string {
  const payload = `${params.action}:${params.bucket}:${params.key}:${params.expiresAt}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyLocalStorageToken(
  token: string,
  expected: { action: LocalStorageAction; bucket: string; key: string }
): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 5) return false;
    const [action, bucket, key, expiresAtStr, sig] = parts;

    if (action !== expected.action || bucket !== expected.bucket || key !== expected.key) return false;

    const expiresAt = Number(expiresAtStr);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

    const payload = `${action}:${bucket}:${key}:${expiresAtStr}`;
    const expectedSig = createHmac("sha256", secret()).update(payload).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
