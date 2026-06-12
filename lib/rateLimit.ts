/**
 * In-memory IP rate limiter shared across routes.
 *
 * Buckets are isolated by `storeName` so each endpoint has its own quota, and
 * by client IP within a store. 10 requests per IP per 10-minute window.
 *
 * Caveat: the Map is per-server-instance (resets on restart, not shared across
 * Vercel lambdas). Good enough to blunt brute-force enumeration of reservation
 * numbers / booking codes; a distributed store (Upstash) would be the next step.
 */

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(storeName: string, ip: string): boolean {
  const key = `${storeName}:${ip}`;
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count++;
  return true;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'unknown';
}
