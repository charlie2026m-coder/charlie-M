import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export type AdminGuard =
  | { ok: true; email: string; role: string }
  | { ok: false; response: NextResponse };

/**
 * Admin guard for API route handlers. Same semantics as
 * app/admin/(protected)/layout.tsx (getUser + admins lookup), but returns a
 * NextResponse instead of redirecting so routes can `return guard.response`.
 */
export async function requireAdmin(): Promise<AdminGuard> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }

  const { data: admin } = await supabase
    .from('admins')
    .select('role')
    .eq('email', user.email)
    .single();

  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true, email: user.email, role: admin.role };
}
