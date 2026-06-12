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
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

const buckets = new Map<string, { count: number; resetAt: number }>();
let lastSweepAt = 0;

// Drop expired buckets so the Map doesn't grow unboundedly (an attacker can
// mint new keys per request — without sweeping that's a slow memory leak).
function sweepExpired(now: number): void {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key);
  }
}

export function checkRateLimit(storeName: string, ip: string): boolean {
  const key = `${storeName}:${ip}`;
  const now = Date.now();
  sweepExpired(now);
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count++;
  return true;
}

/**
 * Client IP from proxy headers, spoof-resistant on Vercel.
 *
 * `x-forwarded-for` is client-appendable: the LEFTMOST entry is whatever the
 * caller sent, so keying the limiter on it let anyone reset their bucket per
 * request. Trust order instead:
 *   1. `x-real-ip` — set (overwritten) by Vercel's edge for every request;
 *   2. the LAST `x-forwarded-for` entry — appended by the closest trusted proxy;
 *   3. 'unknown' (local dev without proxy headers).
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',');
    const last = parts[parts.length - 1]?.trim();
    if (last) return last;
  }

  return 'unknown';
}
