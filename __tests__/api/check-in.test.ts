import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn(() => true),
  getClientIp: vi.fn(() => '1.2.3.4'),
}));

import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { POST } from '@/app/api/check-in/route';

const mockCheckRateLimit = vi.mocked(checkRateLimit);
const mockGetClientIp = vi.mocked(getClientIp);

// CharlieM uses CMH property → RCMH format
const validId = 'RCMH-ABC12345';

const makeRequest = (body: object, ip = '1.2.3.4') => {
  mockGetClientIp.mockReturnValue(ip);
  return new NextRequest('http://localhost/api/check-in', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
};

const mockFetch = (status: number, data: object) => {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
  globalThis.fetch = fn;
  return fn;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockReturnValue(true);
});

afterEach(() => vi.restoreAllMocks());

describe('POST /api/check-in (CharlieM)', () => {
  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue(false);
    const res = await POST(makeRequest({ reservationId: validId }));
    expect(res.status).toBe(429);
  });

  it('returns 400 when reservationId missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid format (not Apaleo format)', async () => {
    const res = await POST(makeRequest({ reservationId: 'invalid!!' }));
    expect(res.status).toBe(400);
  });

  it('normalizes lowercase RCMH- to uppercase', async () => {
    const spy = mockFetch(200, { data: [] });
    await POST(makeRequest({ reservationId: 'rcmh-abc12345' }));
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('RCMH-ABC12345'),
      expect.any(Object)
    );
  });

  it('returns 404 when Guestway returns no data', async () => {
    mockFetch(200, { data: [] });
    const res = await POST(makeRequest({ reservationId: validId }));
    expect(res.status).toBe(404);
  });

  it('returns 200 with only safe fields (id, confirmationCode, status, guestAppUrl)', async () => {
    mockFetch(200, {
      data: [{
        id: 'gw-cmh-1',
        confirmationCode: validId,
        status: 'confirmed',
        guestAppUrl: 'https://app.test/abc',
        guestEmail: 'private@test.com', // should be stripped
      }],
    });
    const res = await POST(makeRequest({ reservationId: validId }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: 'gw-cmh-1', confirmationCode: validId, status: 'confirmed', guestAppUrl: 'https://app.test/abc' });
    expect(body.guestEmail).toBeUndefined();
  });

  it('does not log PII from Guestway response', async () => {
    mockFetch(200, { data: [{ id: 'gw-1', confirmationCode: validId, status: 'ok', guestAppUrl: 'url' }] });
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await POST(makeRequest({ reservationId: validId }));
    const logged = spy.mock.calls.map(c => JSON.stringify(c)).join('');
    expect(logged).not.toMatch(/Full API|guestEmail/);
  });
});
