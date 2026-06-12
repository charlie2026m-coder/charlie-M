import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  evaluate,
  todayBerlin,
  newToken,
  injectSvgLogo,
  sanitizeFilename,
  safeHex,
  makeQr,
  makeQrZip,
  EARLY_CHECKOUT_CONFIRM_DAYS,
} from '@/services/selfCheckout';

const TODAY = '2026-06-12';

function resv(overrides: Record<string, unknown> = {}) {
  return {
    id: 'RCMH-1',
    status: 'InHouse',
    departure: `${TODAY}T11:00:00+02:00`,
    primaryGuest: { firstName: 'Max', lastName: 'Mustermann' },
    balance: { amount: 0, currency: 'EUR' },
    channelCode: 'Direct',
    ...overrides,
  };
}

describe('evaluate (self-checkout policy)', () => {
  it('allows checkout on departure day (not early)', () => {
    const ev = evaluate(resv(), TODAY);
    expect(ev.can_checkout).toBe(true);
    expect(ev.reason).toBe('');
    expect(ev.days_until).toBe(0);
    expect(ev.early).toBe(false);
    expect(ev.guest).toBe('Max Mustermann');
  });

  it('departure tomorrow is not yet "early"', () => {
    const ev = evaluate(resv({ departure: '2026-06-13T11:00:00+02:00' }), TODAY);
    expect(ev.days_until).toBe(1);
    expect(ev.early).toBe(false);
  });

  it(`departure in ${EARLY_CHECKOUT_CONFIRM_DAYS} days is early`, () => {
    const ev = evaluate(resv({ departure: '2026-06-14T11:00:00+02:00' }), TODAY);
    expect(ev.days_until).toBe(2);
    expect(ev.early).toBe(true);
    expect(ev.can_checkout).toBe(true);
  });

  it('blocks only when status is not InHouse', () => {
    for (const status of ['Confirmed', 'CheckedOut', 'Canceled', 'NoShow']) {
      const ev = evaluate(resv({ status }), TODAY);
      expect(ev.can_checkout).toBe(false);
      expect(ev.reason).toBe('not_inhouse');
    }
  });

  it('an open balance does NOT block (automated hotel)', () => {
    const ev = evaluate(resv({ balance: { amount: 123.456, currency: 'EUR' } }), TODAY);
    expect(ev.can_checkout).toBe(true);
    expect(ev.balance).toBe(123.46); // rounded to cents
  });

  it('clamps days_until at 0 for past departures', () => {
    const ev = evaluate(resv({ departure: '2026-06-10T11:00:00+02:00' }), TODAY);
    expect(ev.days_until).toBe(0);
  });

  it('handles malformed departure gracefully', () => {
    const ev = evaluate(resv({ departure: undefined }), TODAY);
    expect(ev.days_until).toBe(0);
    expect(ev.departure).toBe('');
  });

  it('falls back to "Gast" and EUR when guest/balance are missing', () => {
    const ev = evaluate(resv({ primaryGuest: undefined, balance: undefined }), TODAY);
    expect(ev.guest).toBe('Gast');
    expect(ev.balance).toBe(0);
    expect(ev.currency).toBe('EUR');
  });
});

describe('todayBerlin', () => {
  it('rolls over to the next day before UTC midnight in winter (UTC+1)', () => {
    expect(todayBerlin(new Date('2026-01-10T23:30:00Z'))).toBe('2026-01-11');
  });

  it('rolls over to the next day before UTC midnight in summer (UTC+2)', () => {
    expect(todayBerlin(new Date('2026-07-10T22:30:00Z'))).toBe('2026-07-11');
  });

  it('keeps the same date at midday', () => {
    expect(todayBerlin(new Date('2026-06-12T10:00:00Z'))).toBe('2026-06-12');
  });
});

describe('newToken', () => {
  it('produces 12-char URL-safe tokens', () => {
    const t = newToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{12}$/);
  });

  it('is collision-free across many generations', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => newToken()));
    expect(tokens.size).toBe(100);
  });
});

describe('safeHex', () => {
  it('accepts 6-digit hex with or without #', () => {
    expect(safeHex('A09060')).toBe('A09060');
    expect(safeHex('#923D4F')).toBe('923D4F');
  });

  it('falls back on invalid input', () => {
    expect(safeHex('red')).toBe('000000');
    expect(safeHex('12345')).toBe('000000');
    expect(safeHex(undefined)).toBe('000000');
  });
});

describe('injectSvgLogo', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0"/></svg>';

  it('adds a white clearance zone (30% width, 18% radius) and the building', () => {
    const out = injectSvgLogo(svg, 'A09060');
    expect(out).toContain('width="30.00" height="30.00" rx="5.40" fill="#ffffff"');
    expect(out).toContain('fill="#A09060"');
    // 6 windows + 1 door are punched out in white
    expect((out.match(/fill="#fff"/g) || []).length).toBe(7);
    expect(out.endsWith('</svg>')).toBe(true);
  });

  it('returns the svg unchanged when there is no viewBox', () => {
    const plain = '<svg><path/></svg>';
    expect(injectSvgLogo(plain, 'A09060')).toBe(plain);
  });
});

describe('sanitizeFilename', () => {
  it('replaces unsafe characters and trims underscores', () => {
    expect(sanitizeFilename('Zimmer 101/2')).toBe('Zimmer_101_2');
    expect(sanitizeFilename('  Café Nr. 5  ')).toBe('Caf_Nr._5');
  });

  it('falls back to "qr" when nothing is left', () => {
    expect(sanitizeFilename('///')).toBe('qr');
    expect(sanitizeFilename('')).toBe('qr');
  });

  it('caps the length at 60', () => {
    expect(sanitizeFilename('x'.repeat(100)).length).toBe(60);
  });
});

describe('makeQr', () => {
  it('renders a colored SVG', async () => {
    const { data, mime } = await makeQr('https://example.test/checkout/abc', 'svg', '923D4F');
    expect(mime).toBe('image/svg+xml');
    expect(typeof data).toBe('string');
    expect(/923d4f/i.test(data as string)).toBe(true);
  });

  it('injects the logo into SVG when requested', async () => {
    const { data } = await makeQr('https://example.test/checkout/abc', 'svg', 'A09060', true);
    expect(data as string).toContain('fill="#A09060"');
    expect((data as string)).toContain('rx=');
  });

  it('renders a PNG buffer', async () => {
    const { data, mime } = await makeQr('https://example.test/checkout/abc', 'png', '000000');
    expect(mime).toBe('image/png');
    const buf = data as Buffer;
    expect(buf[0]).toBe(0x89);
    expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  });
});

describe('makeQrZip', () => {
  it('writes one file per item and suffixes duplicate names', async () => {
    const zip = await makeQrZip(
      [
        { base: 'Room 101', url: 'https://example.test/checkout/a' },
        { base: 'Room 101', url: 'https://example.test/checkout/b' },
        { base: 'Room/102', url: 'https://example.test/checkout/c' },
      ],
      'svg',
      '000000',
      false
    );
    const loaded = await JSZip.loadAsync(zip);
    const names = Object.keys(loaded.files).sort();
    expect(names).toEqual(['Room_101.svg', 'Room_101_1.svg', 'Room_102.svg']);
    const first = await loaded.files['Room_101.svg'].async('string');
    expect(first).toContain('<svg');
  });
});
