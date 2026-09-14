import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRedirect } = vi.hoisted(() => ({ mockRedirect: vi.fn() }));

vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: vi.fn() }));
// The shell is a client component that builds the browser Supabase client on
// import; the guard under test is the layout, not the frame around it.
vi.mock('@/app/_components/admin/AdminShell', () => ({
  AdminShell: ({ children }: { children: unknown }) => children,
}));

import { createSupabaseServerClient } from '@/lib/supabase-server';
import AdminLayout from '@/app/admin/(protected)/layout';

const mockCreateClient = vi.mocked(createSupabaseServerClient);

const ALL = ['breakfast', 'hotel', 'kitchen', 'team'];

function makeSupabase(user: object | null, adminData: object | null = null) {
  const single = vi.fn().mockResolvedValue({ data: adminData, error: null });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
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
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 'u1', email: 'admin@charlie-m.de' }, { role: 'admin', areas: ALL }));
    const result = await AdminLayout({ children: 'content' as any });
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it('sends the kitchen-only login to its own screens', async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabase({ id: 'u1', email: 'kitchen@charlie-m.de' }, { role: 'kitchen', areas: ['kitchen'] }),
    );
    await expect(AdminLayout({ children: null })).rejects.toThrow('REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/kitchen');
  });

  it('a row with nothing to do goes back to the login page', async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabase({ id: 'u1', email: 'nobody@charlie-m.de' }, { role: 'admin', areas: [] }),
    );
    await expect(AdminLayout({ children: null })).rejects.toThrow('REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/admin/login');
  });

  it('queries admins table with user email', async () => {
    mockRedirect.mockImplementation(() => {});
    const supabase = makeSupabase({ id: 'u1', email: 'admin@charlie-m.de' }, { role: 'admin', areas: ALL });
    mockCreateClient.mockResolvedValue(supabase);
    await AdminLayout({ children: null });
    expect(supabase.from).toHaveBeenCalledWith('admins');
  });
});
