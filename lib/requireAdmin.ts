import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { canUsePanel, normaliseAreas, type Area } from '@/lib/adminAccess';

/**
 * The one answer to "who is this, and may they be here" for every admin
 * surface: the (protected) layout, the kitchen layout and every /api/admin
 * route go through here.
 *
 * Three things are checked, in this order:
 *   1. a signed-in user (validated with the auth server, not read off a cookie);
 *   2. a row in `admins`, which carries what the person may do (`areas`);
 *   3. two-factor: somebody who has set it up must have passed it THIS
 *      session. The token's `aal` claim says so. Without this the second
 *      factor would be decoration — a password alone would still open
 *      every screen, since the layouts only ever asked "is there a user".
 */

export interface AdminSession {
  status: 'ok';
  email: string;
  userId: string;
  name: string | null;
  role: string;
  areas: Area[];
}

export type AdminSessionResult =
  | AdminSession
  | { status: 'anonymous' | 'not-staff' | 'second-factor' };

/**
 * The `aal` claim of the access token. The token was just validated by
 * getUser() — the auth server accepted this exact string — so its claims are
 * genuine; only the signature check would be redundant here.
 */
function assuranceLevel(accessToken: string | undefined): string | null {
  if (!accessToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'));
    return typeof payload?.aal === 'string' ? payload.aal : null;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSessionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { status: 'anonymous' };

  const { data: row } = await supabase
    .from('admins')
    .select('role, areas, name')
    .eq('email', user.email)
    .single();
  if (!row) return { status: 'not-staff' };

  const enrolled = (user.factors ?? []).some(f => f.status === 'verified');
  if (enrolled) {
    const { data: { session } } = await supabase.auth.getSession();
    if (assuranceLevel(session?.access_token) !== 'aal2') return { status: 'second-factor' };
  }

  return {
    status: 'ok',
    email: user.email,
    userId: user.id,
    name: row.name ?? null,
    role: row.role ?? '',
    areas: normaliseAreas(row.areas),
  };
}

export type AdminGuard =
  | ({ ok: true } & AdminSession)
  | { ok: false; response: NextResponse };

const fail = (status: number, error: string, code?: string): AdminGuard => ({
  ok: false,
  response: NextResponse.json(code ? { error, code } : { error }, { status }),
});

/**
 * Admin guard for API route handlers. Returns a NextResponse instead of
 * redirecting so routes can `return guard.response`.
 *
 * `anyOf` names the areas that open this route; without it the route is for
 * anybody who may use the panel at all (which leaves the kitchen-only login
 * out — its two routes say so explicitly).
 */
export async function requireAdmin(
  opts: { anyOf?: readonly Area[] } = {},
): Promise<AdminGuard> {
  const s = await getAdminSession();
  if (s.status === 'anonymous') return fail(401, 'Authentication required');
  if (s.status === 'second-factor') return fail(401, 'Second factor required', 'mfa_required');
  if (s.status !== 'ok') return fail(403, 'Forbidden');

  const allowed = opts.anyOf ? opts.anyOf.some(a => s.areas.includes(a)) : canUsePanel(s.areas);
  if (!allowed) return fail(403, 'Forbidden');

  return { ok: true, ...s };
}
