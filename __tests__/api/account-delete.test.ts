import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

// service_role client mock
let currentAdminFrom = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (...args: any[]) => currentAdminFrom(...args),
    // Anonymization runs through an atomic RPC (anonymize_user_data_for_deletion).
    rpc: vi.fn().mockResolvedValue({ error: null }),
    auth: makeAdminAuth(),
  })),
}));

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { POST } from '@/app/api/account/delete/route';

const mockCreateClient = vi.mocked(createSupabaseServerClient);

function makeAdminFrom() {
  return vi.fn().mockReturnValue({
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  });
}

function makeAdminAuth() {
  return {
    admin: {
      deleteUser: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

function makeSupabase(user: object | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ data: [], error: null }) }),
    }),
  } as any;
}

function makeRequest() {
  return new NextRequest('http://localhost/api/account/delete', { method: 'POST' });
}

beforeEach(() => {
  vi.clearAllMocks();
  currentAdminFrom = makeAdminFrom();
});

describe('POST /api/account/delete', () => {
  it('returns 401 when no session', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase(null));
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 200 on successful deletion', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'user@test.com' }));
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
  });

  it('records deletion consent (via service_role) before deleting account', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'user@test.com' }));
    await POST(makeRequest());
    // The GDPR audit consent is written with the service_role client so the
    // row survives (consents.user_id FK is SET NULL, not CASCADE).
    expect(currentAdminFrom).toHaveBeenCalledWith('consents');
  });
});
