import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyLocalStorageToken } from "@/server/services/storage/local-signing";
import { readLocalObject } from "@/server/services/storage/local-provider";
import type { StorageBucket } from "@/server/services/storage/provider";

// Mimics an S3 presigned GET — see upload/route.ts for the same caveat. Real
// download authorization (does this user own a PAID order for this file?) already
// happened before a token was minted, in DownloadService.authorizeAndIssue — this
// route only proves the token itself is valid and unexpired.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bucket = searchParams.get("bucket") as StorageBucket | null;
  const key = searchParams.get("key");
  const token = searchParams.get("token");

  if (!bucket || !key || !token || (bucket !== "previews" && bucket !== "deliverables")) {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Missing parameters." } }, { status: 400 });
  }
  if (!verifyLocalStorageToken(token, { action: "download", bucket, key })) {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "This download link has expired." } }, { status: 403 });
  }

  try {
    const buffer = await readLocalObject(bucket, key);
    const filename = key.split("/").pop() ?? "download";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "File not found." } }, { status: 404 });
  }
}
