export type StorageBucket = "previews" | "deliverables";

export interface StorageProvider {
  getUploadUrl(
    bucket: StorageBucket,
    filename: string,
    contentType: string
  ): Promise<{ uploadUrl: string; storageKey: string }>;
  getSignedDownloadUrl(bucket: StorageBucket, key: string, expiresInSeconds?: number): Promise<string>;
  getPublicPreviewUrl(key: string): string;
  getObjectBuffer(bucket: StorageBucket, key: string): Promise<Buffer>;
  deleteObject(bucket: StorageBucket, key: string): Promise<void>;
}
