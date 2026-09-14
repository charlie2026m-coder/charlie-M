import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export type AdminGuard =
  | { ok: true; email: string; role: string }
  | { ok: false; response: NextResponse };

/**
 * The restaurant's role. A row in `admins` with this role may use the kitchen
 * screens — the morning sheet and the door scanner — and nothing else. Every
 * other role value (`admin`, `super_admin`, whatever else has been typed into
 * that column) is a full admin, exactly as before this distinction existed.
 */
export const KITCHEN_ROLE = 'kitchen';
export const isKitchenRole = (role?: string | null): boolean => role === KITCHEN_ROLE;

/**
 * Admin guard for API route handlers. Same semantics as
 * app/admin/(protected)/layout.tsx (getUser + admins lookup), but returns a
 * NextResponse instead of redirecting so routes can `return guard.response`.
 */
export async function requireAdmin(
  opts: {
    /** Let the restaurant's login through. Off by default, so a route has to
     *  say so to be reachable from the kitchen — the setup screens never are. */
    allowKitchen?: boolean;
  } = {},
): Promise<AdminGuard> {
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

  if (isKitchenRole(admin.role) && !opts.allowKitchen) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true, email: user.email, role: admin.role };
}
