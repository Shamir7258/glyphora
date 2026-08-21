import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyLocalStorageToken } from "@/server/services/storage/local-signing";
import { writeLocalObject } from "@/server/services/storage/local-provider";
import type { StorageBucket } from "@/server/services/storage/provider";

// Mimics an S3 presigned PUT — only reachable with a valid, time-boxed token
// minted by LocalStorageProvider.getUploadUrl(). Local-dev-only stand-in for a
// real bucket (see docs/DEVELOPMENT.md); production deployments set
// STORAGE_PROVIDER=s3 and never hit this route.
export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bucket = searchParams.get("bucket") as StorageBucket | null;
  const key = searchParams.get("key");
  const token = searchParams.get("token");

  if (!bucket || !key || !token || (bucket !== "previews" && bucket !== "deliverables")) {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Missing parameters." } }, { status: 400 });
  }
  if (!verifyLocalStorageToken(token, { action: "upload", bucket, key })) {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Invalid or expired upload URL." } }, { status: 403 });
  }

  const bytes = Buffer.from(await request.arrayBuffer());
  await writeLocalObject(bucket, key, bytes);

  return NextResponse.json({ ok: true, data: { storageKey: key, size: bytes.byteLength } });
}
