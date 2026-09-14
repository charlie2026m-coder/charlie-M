import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

/**
 * The numbers above the dates on the kitchen screen: seven mornings, a head
 * count each, nothing else. The kitchen login may read it; money may not
 * leave this route.
 */

vi.mock('@/lib/requireAdmin', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/services/breakfast', () => ({
  berlinToday: () => '2026-09-14',
  breakfastOverview: vi.fn(),
}));

import { requireAdmin } from '@/lib/requireAdmin';
import { breakfastOverview } from '@/services/breakfast';
import { GET } from '@/app/api/admin/breakfast/counts/route';

const guard = vi.mocked(requireAdmin);
const overview = vi.mocked(breakfastOverview);

const get = (query = '') => GET(new NextRequest(`https://charlie-m.de/api/admin/breakfast/counts${query}`));

beforeEach(() => {
  vi.clearAllMocks();
  guard.mockResolvedValue({ ok: true, status: 'ok', email: 'k@x', userId: 'u', name: null, role: 'staff', areas: ['kitchen'] } as never);
  overview.mockResolvedValue({
    from: '2026-09-14',
    to: '2026-09-20',
    pricePerPerson: 19.9,
    days: [
      { morning: '2026-09-15', covers: 11, reservations: 6, chosen: 9, revenue: 218.9 },
      { morning: '2026-09-17', covers: 17, reservations: 9, chosen: 17, revenue: 338.3 },
    ],
    totals: { covers: 28, chosen: 26, revenue: 557.2 },
    truncated: false,
  });
});

describe('who may ask', () => {
  it('lets the kitchen login in — that is the screen it feeds', async () => {
    await get();

    expect(guard).toHaveBeenCalledWith({ anyOf: ['breakfast', 'kitchen'] });
  });

  it('answers with the guard refusal when there is one', async () => {
    guard.mockResolvedValue({ ok: false, response: NextResponse.json({ error: 'no' }, { status: 401 }) } as never);

    const res = await get();

    expect(res.status).toBe(401);
    expect(overview).not.toHaveBeenCalled();
  });
});

describe('what leaves the route', () => {
  it('is the head count per morning and nothing else — no money, no names', async () => {
    const body = await (await get('?from=2026-09-14&to=2026-09-20')).json();

    expect(body.days).toEqual([
      { morning: '2026-09-15', covers: 11 },
      { morning: '2026-09-17', covers: 17 },
    ]);
    expect(JSON.stringify(body)).not.toMatch(/revenue|price|reservations|chosen/);
  });

  it('defaults to seven mornings from today', async () => {
    await get();

    expect(overview).toHaveBeenCalledWith('2026-09-14', '2026-09-20');
  });

  it('never asks for more than a month', async () => {
    await get('?from=2026-09-14&to=2026-12-31');

    expect(overview).toHaveBeenCalledWith('2026-09-14', '2026-10-14');
  });

  it('turns a backwards range into one morning', async () => {
    await get('?from=2026-09-14&to=2026-09-01');

    expect(overview).toHaveBeenCalledWith('2026-09-14', '2026-09-14');
  });

  it('ignores a malformed date rather than passing it on', async () => {
    await get('?from=tomorrow');

    expect(overview).toHaveBeenCalledWith('2026-09-14', '2026-09-20');
  });
});
