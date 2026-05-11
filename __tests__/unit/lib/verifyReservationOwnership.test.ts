import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyReservationOwnership } from '@/lib/verifyReservationOwnership';

// Mock Fetch from services/Request
vi.mock('@/services/Request', () => ({
  Fetch: vi.fn(),
}));

import { Fetch } from '@/services/Request';
const mockFetch = vi.mocked(Fetch);

const makeSupabase = (ownershipData: object | null) => ({
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: ownershipData, error: null }),
        }),
      }),
    }),
  }),
});

const makeUser = (email: string | undefined) => ({ id: 'user-123', email } as any);

describe('verifyReservationOwnership', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns ok:true when DB ownership row found', async () => {
    const supabase = makeSupabase({ id: 1 }) as any;
    const result = await verifyReservationOwnership(supabase, makeUser('user@example.com'), 'RMOT-ABC123');
    expect(result).toEqual({ ok: true });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches from Apaleo when DB returns null (OTA booking)', async () => {
    const supabase = makeSupabase(null) as any;
    mockFetch.mockResolvedValueOnce({ booker: { email: 'user@example.com' } } as any);

    const result = await verifyReservationOwnership(supabase, makeUser('user@example.com'), 'RMOT-OTA');
    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('RMOT-OTA'));
  });

  it('returns forbidden when booker email does not match user email', async () => {
    const supabase = makeSupabase(null) as any;
    mockFetch.mockResolvedValueOnce({ booker: { email: 'other@example.com' } } as any);

    const result = await verifyReservationOwnership(supabase, makeUser('user@example.com'), 'RMOT-XYZ');
    expect(result).toEqual({ ok: false, status: 403, error: 'Forbidden' });
  });

  it('returns forbidden when booker email is null (null bypass blocked)', async () => {
    const supabase = makeSupabase(null) as any;
    mockFetch.mockResolvedValueOnce({ booker: { email: null } } as any);

    const result = await verifyReservationOwnership(supabase, makeUser('user@example.com'), 'RMOT-NULL');
    expect(result).toEqual({ ok: false, status: 403, error: 'Forbidden' });
  });

  it('returns forbidden when user email is null (anonymous user)', async () => {
    const supabase = makeSupabase(null) as any;
    mockFetch.mockResolvedValueOnce({ booker: { email: 'booker@example.com' } } as any);

    const result = await verifyReservationOwnership(supabase, makeUser(undefined), 'RMOT-ANON');
    expect(result).toEqual({ ok: false, status: 403, error: 'Forbidden' });
  });

  it('returns not-found when Apaleo throws', async () => {
    const supabase = makeSupabase(null) as any;
    mockFetch.mockRejectedValueOnce(new Error('404 not found'));

    const result = await verifyReservationOwnership(supabase, makeUser('user@example.com'), 'RMOT-MISSING');
    expect(result).toEqual({ ok: false, status: 404, error: 'Reservation not found' });
  });

  it('uses cachedBookerEmail and skips Apaleo fetch when options provided', async () => {
    const supabase = makeSupabase(null) as any;

    const result = await verifyReservationOwnership(
      supabase,
      makeUser('user@example.com'),
      'RMOT-CACHED',
      { cachedBookerEmail: 'user@example.com' }
    );
    expect(result).toEqual({ ok: true });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns forbidden with cached null email without calling Apaleo', async () => {
    const supabase = makeSupabase(null) as any;

    const result = await verifyReservationOwnership(
      supabase,
      makeUser('user@example.com'),
      'RMOT-CACHEDNULL',
      { cachedBookerEmail: null }
    );
    expect(result).toEqual({ ok: false, status: 403, error: 'Forbidden' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('comparison is case-insensitive', async () => {
    const supabase = makeSupabase(null) as any;
    mockFetch.mockResolvedValueOnce({ booker: { email: 'User@EXAMPLE.COM' } } as any);

    const result = await verifyReservationOwnership(supabase, makeUser('user@example.com'), 'RMOT-CASE');
    expect(result).toEqual({ ok: true });
  });
});
