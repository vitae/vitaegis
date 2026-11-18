/* Fixed-window request limits held in this server instance's memory. A brake on one caller
   hammering a route that costs money, not a global quota: each instance counts on its own. */

interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_KEYS = 5000;
const buckets = new Map<string, Bucket>();

export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.headers.get('x-real-ip')?.trim() || 'unknown';
}

function sweep(now: number) {
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  if (buckets.size >= MAX_KEYS) buckets.clear();
}

/** Counts one request against `key`. `now` is injectable for tests. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { ok: boolean; retryAfterS: number } {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) sweep(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterS: 0 };
  }
  bucket.count += 1;
  if (bucket.count <= limit) return { ok: true, retryAfterS: 0 };
  return { ok: false, retryAfterS: Math.ceil((bucket.resetAt - now) / 1000) };
}

export function tooMany(error: string, retryAfterS: number): Response {
  return Response.json({ error }, { status: 429, headers: { 'Retry-After': String(retryAfterS) } });
}
