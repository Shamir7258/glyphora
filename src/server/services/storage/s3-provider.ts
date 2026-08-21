import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import type { StorageProvider, StorageBucket } from "@/server/services/storage/provider";

const BUCKETS: Record<StorageBucket, string> = {
  previews: process.env.STORAGE_BUCKET_PREVIEWS ?? "glyphora-previews",
  deliverables: process.env.STORAGE_BUCKET_DELIVERABLES ?? "glyphora-deliverables",
};

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;
  client = new S3Client({
    region: process.env.STORAGE_REGION || "auto",
    endpoint: process.env.STORAGE_ENDPOINT || undefined, // unset = real AWS S3; set = R2/MinIO/etc.
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "",
    },
    forcePathStyle: !!process.env.STORAGE_ENDPOINT,
  });
  return client;
}

function buildKey(prefix: string, filename: string): string {
  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
  return `${prefix}/${nanoid(16)}${ext}`;
}

/** AWS S3 / Cloudflare R2 (anything speaking the S3 API — point STORAGE_ENDPOINT at it). */
export const S3StorageProvider: StorageProvider = {
  async getUploadUrl(bucket, filename, contentType) {
    const key = buildKey(bucket === "previews" ? "uploads/previews" : "uploads/deliverables", filename);
    const command = new PutObjectCommand({ Bucket: BUCKETS[bucket], Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn: 300 });
    return { uploadUrl, storageKey: key };
  },

  async getSignedDownloadUrl(bucket, key, expiresInSeconds = 300) {
    const command = new GetObjectCommand({ Bucket: BUCKETS[bucket], Key: key });
    return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds });
  },

  getPublicPreviewUrl(key) {
    const base = process.env.STORAGE_PUBLIC_BASE_URL?.replace(/\/$/, "");
    if (base) return `${base}/${key}`;
    return `${process.env.STORAGE_ENDPOINT ?? ""}/${BUCKETS.previews}/${key}`;
  },

  async getObjectBuffer(bucket, key) {
    const res = await getClient().send(new GetObjectCommand({ Bucket: BUCKETS[bucket], Key: key }));
    const bytes = await res.Body?.transformToByteArray();
    return Buffer.from(bytes ?? []);
  },

  async deleteObject(bucket, key) {
    await getClient().send(new DeleteObjectCommand({ Bucket: BUCKETS[bucket], Key: key }));
  },
};
