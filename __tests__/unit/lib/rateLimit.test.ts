import { describe, it, expect, beforeEach, vi } from 'vitest';

// Re-import the module fresh each test to reset the module-level Map
let checkRateLimit: (storeName: string, ip: string) => boolean;
let getClientIp: (request: Request) => string;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('@/lib/rateLimit');
  checkRateLimit = mod.checkRateLimit;
  getClientIp = mod.getClientIp;
});

describe('checkRateLimit', () => {
  it('allows a new IP on first request', () => {
    expect(checkRateLimit('store1', '1.1.1.1')).toBe(true);
  });

  it('increments counter for same IP within window', () => {
    for (let i = 0; i < 9; i++) checkRateLimit('store2', '2.2.2.2');
    expect(checkRateLimit('store2', '2.2.2.2')).toBe(true); // 10th request: still allowed
  });

  it('blocks IP after max requests (10)', () => {
    for (let i = 0; i < 10; i++) checkRateLimit('store3', '3.3.3.3');
    expect(checkRateLimit('store3', '3.3.3.3')).toBe(false); // 11th blocked
  });

  it('resets counter after window expires', () => {
    vi.useFakeTimers();
    for (let i = 0; i < 10; i++) checkRateLimit('store4', '4.4.4.4');
    expect(checkRateLimit('store4', '4.4.4.4')).toBe(false);

    vi.advanceTimersByTime(11 * 60 * 1000); // 11 minutes
    expect(checkRateLimit('store4', '4.4.4.4')).toBe(true);
    vi.useRealTimers();
  });

  it('isolates buckets by store name', () => {
    for (let i = 0; i < 10; i++) checkRateLimit('storeA', '5.5.5.5');
    expect(checkRateLimit('storeA', '5.5.5.5')).toBe(false);
    // Same IP in different store → not blocked
    expect(checkRateLimit('storeB', '5.5.5.5')).toBe(true);
  });

  it('isolates buckets by IP', () => {
    for (let i = 0; i < 10; i++) checkRateLimit('storeC', '6.6.6.6');
    expect(checkRateLimit('storeC', '6.6.6.6')).toBe(false);
    // Different IP in same store → not blocked
    expect(checkRateLimit('storeC', '7.7.7.7')).toBe(true);
  });
});

describe('getClientIp', () => {
  it('prefers x-real-ip (Vercel-controlled) over x-forwarded-for', () => {
    const req = new Request('http://x', {
      headers: { 'x-real-ip': '9.10.11.12', 'x-forwarded-for': 'spoofed, 5.6.7.8' },
    });
    expect(getClientIp(req)).toBe('9.10.11.12');
  });

  it('takes the LAST x-forwarded-for entry — the leftmost is client-appendable', () => {
    // A spoofer prepends fake entries; the trusted proxy appends the real one
    // last. Keying on the first entry let attackers reset their bucket freely.
    const req = new Request('http://x', { headers: { 'x-forwarded-for': 'fake1, fake2, 5.6.7.8' } });
    expect(getClientIp(req)).toBe('5.6.7.8');
  });

  it('returns unknown when no IP headers', () => {
    const req = new Request('http://x');
    expect(getClientIp(req)).toBe('unknown');
  });
});

describe('bucket sweeping', () => {
  it('drops expired buckets so the map does not grow unboundedly', async () => {
    vi.useFakeTimers();
    for (let i = 0; i < 50; i++) checkRateLimit('sweep-store', `ip-${i}`);

    // Past the window AND past the sweep interval: next call sweeps.
    vi.advanceTimersByTime(11 * 60 * 1000);
    checkRateLimit('sweep-store', 'fresh-ip');

    // Old buckets are gone: an old IP starts a fresh window (count 1 again,
    // i.e. 10 more requests allowed).
    for (let i = 0; i < 9; i++) checkRateLimit('sweep-store', 'ip-0');
    expect(checkRateLimit('sweep-store', 'ip-0')).toBe(true);
    vi.useRealTimers();
  });
});
