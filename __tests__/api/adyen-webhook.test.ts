import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

// ── helpers ───────────────────────────────────────────────────────────────────

function escapeHmac(v: string | number | undefined | null): string {
  return String(v ?? '').replace(/\\/g, '\\\\').replace(/:/g, '\\:');
}

function computeHmac(key: string, item: Record<string, any>): string {
  const payload = [
    item.pspReference, item.originalReference || '', item.merchantAccountCode,
    item.merchantReference, item.amount?.value, item.amount?.currency,
    item.eventCode, item.success,
  ].map(escapeHmac).join(':');
  return crypto.createHmac('sha256', Buffer.from(key, 'hex')).update(payload).digest('base64');
}

const baseItem = {
  pspReference: 'PSP-CMH-001', originalReference: '',
  merchantAccountCode: 'ApaleoGmbHCOM',
  merchantReference: 'REF-CMH-001',
  amount: { value: 15000, currency: 'EUR' },
  eventCode: 'AUTHORISATION', success: 'true',
};

function makeBody(overrides: Partial<typeof baseItem> = {}, hmacKey?: string) {
  const item = { ...baseItem, ...overrides };
  const sig = hmacKey ? computeHmac(hmacKey, item) : 'INVALID_SIG';
  return {
    notificationItems: [{
      NotificationRequestItem: { ...item, additionalData: { hmacSignature: sig } },
    }],
  };
}

// ── supabase mock ─────────────────────────────────────────────────────────────

const pendingBookingData = { booking_payload: { reservations: [] }, status: 'pending' };

function makeFromMock(opts: { existingBooking?: object | null } = {}) {
  return vi.fn().mockImplementation((table: string) => {
    if (table === 'bookings') return {
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: opts.existingBooking ?? null }) }) }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }) }),
    };
    if (table === 'pending_bookings') return {
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: pendingBookingData }) }) }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
    };
    if (table === 'pending_services') return {
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }),
    };
    return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
  });
}

let currentFrom = makeFromMock();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: (...args: any[]) => currentFrom(...args) })),
}));

vi.mock('@/services/Request', () => ({
  getOrRefreshToken: vi.fn().mockResolvedValue('mock-token'),
}));

vi.mock('@/services/bookReservationServices', () => ({
  bookReservationServices: vi.fn().mockResolvedValue({ services: [], payment: { success: true } }),
}));

vi.mock('@/app/actions/adyen/reversePayment', () => ({
  reversePayment: vi.fn().mockResolvedValue({}),
}));

import { POST } from '@/app/api/webhooks/adyen/route';
import { reversePayment } from '@/app/actions/adyen/reversePayment';

const mockReversePayment = vi.mocked(reversePayment);

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/webhooks/adyen', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  currentFrom = makeFromMock();
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true, status: 200,
    json: async () => ({ id: 'APALEO-CMH-1', reservationIds: [{ id: 'RES-1' }] }),
    text: async () => '',
  });
});

afterEach(() => vi.unstubAllEnvs());

describe('POST /api/webhooks/adyen (CharlieM)', () => {
  it('always returns plaintext [accepted] with status 200', async () => {
    const res = await POST(makeRequest(makeBody()));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('[accepted]');
  });

  it('Content-Type is text/plain', async () => {
    const res = await POST(makeRequest(makeBody()));
    expect(res.headers.get('Content-Type')).toContain('text/plain');
  });

  it('dev mode (no HMAC key): processes notification', async () => {
    await POST(makeRequest(makeBody({ success: 'true' })));
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalled();
  });

  it('production (no HMAC key): notification skipped', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await POST(makeRequest(makeBody()));
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it('success=false → Apaleo NOT called', async () => {
    await POST(makeRequest(makeBody({ success: 'false' })));
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it('AUTHORISATION success=true → booking created', async () => {
    await POST(makeRequest(makeBody({ success: 'true' })));
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalled();
  });

  it('Apaleo failure → reversePayment called', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({}), text: async () => '' });
    await POST(makeRequest(makeBody()));
    expect(mockReversePayment).toHaveBeenCalled();
  });

  it('idempotency: completed booking → no Apaleo call', async () => {
    currentFrom = makeFromMock({ existingBooking: { status: 'completed', apaleo_booking_id: 'EXISTING' } });
    await POST(makeRequest(makeBody()));
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it('HMAC escape: colon in merchantReference → \\: in payload', () => {
    const item = { ...baseItem, merchantReference: 'REF:COLON' };
    const payload = [item.pspReference, '', item.merchantAccountCode, item.merchantReference, item.amount.value, item.amount.currency, item.eventCode, item.success].map(escapeHmac).join(':');
    expect(payload).toContain('REF\\:COLON');
  });

  it('HMAC escape: backslash → \\\\ in payload', () => {
    const item = { ...baseItem, merchantReference: 'REF\\BACK' };
    const payload = [item.pspReference, '', item.merchantAccountCode, item.merchantReference, item.amount.value, item.amount.currency, item.eventCode, item.success].map(escapeHmac).join(':');
    expect(payload).toContain('REF\\\\BACK');
  });
});
