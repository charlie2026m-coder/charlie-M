import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRedirect } = vi.hoisted(() => ({ mockRedirect: vi.fn() }));

vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: vi.fn() }));

import { createSupabaseServerClient } from '@/lib/supabase-server';
import AdminLayout from '@/app/admin/(protected)/layout';

const mockCreateClient = vi.mocked(createSupabaseServerClient);

function makeSupabase(user: object | null, adminData: object | null = null) {
  const single = vi.fn().mockResolvedValue({ data: adminData, error: null });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockReturnValue({ select }),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRedirect.mockImplementation(() => { throw new Error('REDIRECT'); });
});

describe('Admin (protected) layout — server-side guard (CharlieM)', () => {
  it('redirects to /admin/login when no session', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase(null));
    await expect(AdminLayout({ children: null })).rejects.toThrow('REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/admin/login');
  });

  it('redirects when user has no email (anon user)', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: undefined }));
    await expect(AdminLayout({ children: null })).rejects.toThrow('REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/admin/login');
  });

  it('redirects when email not in admins table', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'notadmin@test.com' }, null));
    await expect(AdminLayout({ children: null })).rejects.toThrow('REDIRECT');
  });

  it('allows access when user is admin', async () => {
    mockRedirect.mockImplementation(() => {});
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'admin@charlie-m.de' }, { role: 'admin' }));
    const result = await AdminLayout({ children: 'content' as any });
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it('queries admins table with user email', async () => {
    mockRedirect.mockImplementation(() => {});
    const supabase = makeSupabase({ id: 'u1', email: 'admin@charlie-m.de' }, { role: 'admin' });
    mockCreateClient.mockResolvedValue(supabase);
    await AdminLayout({ children: null });
    expect(supabase.from).toHaveBeenCalledWith('admins');
  });
});
