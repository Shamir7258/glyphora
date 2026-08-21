import { ApiError } from "@/types/errors";

type Bucket = { count: number; resetAt: number };

// In-memory token bucket, keyed by "route:ip". Sufficient for a single-instance
// V1 deployment — swap for a Redis-backed limiter before scaling horizontally
// (documented limitation, see docs/API_CONTRACTS.md).
const buckets = new Map<string, Bucket>();

// Periodically sweep expired buckets so this doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 60_000).unref?.();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  bucket.count += 1;
  if (bucket.count > limit) throw ApiError.rateLimited();
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
