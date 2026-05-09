// In-memory rate limiter shared across routes via named stores.
// Resets on server restart; not shared across Vercel instances.

interface Entry { count: number; resetAt: number }

const stores = new Map<string, Map<string, Entry>>();

const DEFAULT_MAX = 10;
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;

export function checkRateLimit(
  storeName: string,
  ip: string,
  options?: { max?: number; windowMs?: number }
): boolean {
  const max = options?.max ?? DEFAULT_MAX;
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;

  let store = stores.get(storeName);
  if (!store) {
    store = new Map();
    stores.set(storeName, store);
  }

  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    for (const [key, val] of store) {
      if (now > val.resetAt) store.delete(key);
    }
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count++;
  return true;
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}
