import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { signLocalStorageToken } from "@/server/services/storage/local-signing";
import type { StorageProvider, StorageBucket } from "@/server/services/storage/provider";

const REPO_ROOT = process.cwd();
// Previews live under public/ so Next.js serves them statically at /uploads/previews/<key>
// — genuinely public, matching what the S3 provider does for the previews bucket.
// Deliverables live outside public/ in a gitignored directory and are only ever
// readable through the signed local-storage download route.
const ROOTS: Record<StorageBucket, string> = {
  previews: path.join(REPO_ROOT, "public", "uploads", "previews"),
  deliverables: path.join(REPO_ROOT, ".local-storage", "deliverables"),
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const UPLOAD_URL_TTL_MS = 5 * 60 * 1000;

function resolveSafePath(bucket: StorageBucket, key: string): string {
  // Reject any key that would escape its bucket root (e.g. "../../etc/passwd")
  // before it ever reaches fs — bucket keys are server-generated (nanoid) so this
  // is defense in depth, not the primary guarantee.
  if (key.includes("..") || path.isAbsolute(key)) throw new Error("Invalid storage key.");
  // turbopackIgnore: the bucket root is one of exactly two statically-known
  // directories (see ROOTS above); this dynamic join is safe and intentionally
  // scoped, not a general filesystem read that needs whole-project tracing.
  return path.join(/* turbopackIgnore: true */ ROOTS[bucket], key);
}

function buildKey(filename: string): string {
  // No folder prefix here — the bucket root (ROOTS.previews / ROOTS.deliverables)
  // already provides that namespacing, unlike the S3 provider's flat bucket.
  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
  return `${nanoid(16)}${ext}`;
}

/**
 * Local-disk storage — the default so the app runs and can be demoed without real
 * AWS/R2 credentials (see docs/DEVELOPMENT.md). Swap STORAGE_PROVIDER=s3 in .env
 * once real bucket credentials are available; every caller uses the same
 * StorageService.* API either way (docs/ARCHITECTURE.md §6).
 */
export const LocalStorageProvider: StorageProvider = {
  async getUploadUrl(bucket, filename, _contentType) {
    void _contentType;
    const key = buildKey(filename);
    const expiresAt = Date.now() + UPLOAD_URL_TTL_MS;
    const token = signLocalStorageToken({ action: "upload", bucket, key, expiresAt });
    const uploadUrl = `${APP_URL}/api/local-storage/upload?bucket=${bucket}&key=${encodeURIComponent(key)}&token=${token}`;
    return { uploadUrl, storageKey: key };
  },

  async getSignedDownloadUrl(bucket, key, expiresInSeconds = 300) {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const token = signLocalStorageToken({ action: "download", bucket, key, expiresAt });
    return `${APP_URL}/api/local-storage/download?bucket=${bucket}&key=${encodeURIComponent(key)}&token=${token}`;
  },

  getPublicPreviewUrl(key) {
    return `/uploads/previews/${key}`;
  },

  async getObjectBuffer(bucket, key) {
    return readFile(resolveSafePath(bucket, key));
  },

  async deleteObject(bucket, key) {
    await unlink(resolveSafePath(bucket, key)).catch(() => undefined);
  },
};

export async function writeLocalObject(bucket: StorageBucket, key: string, data: Buffer) {
  const filePath = resolveSafePath(bucket, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
}

export async function readLocalObject(bucket: StorageBucket, key: string) {
  return readFile(resolveSafePath(bucket, key));
}
