import { S3StorageProvider } from "@/server/services/storage/s3-provider";
import { LocalStorageProvider } from "@/server/services/storage/local-provider";
import type { StorageProvider, StorageBucket } from "@/server/services/storage/provider";

// STORAGE_PROVIDER=local (default) needs no cloud credentials — see
// docs/DEVELOPMENT.md. Set STORAGE_PROVIDER=s3 once real AWS S3 / Cloudflare R2
// bucket credentials are in .env. Never import S3StorageProvider/LocalStorageProvider
// directly outside this file — see docs/ARCHITECTURE.md §6.
const activeProvider: StorageProvider =
  process.env.STORAGE_PROVIDER === "s3" ? S3StorageProvider : LocalStorageProvider;

export const StorageService = activeProvider;
export type { StorageBucket };
