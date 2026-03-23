import { supabase } from '@/lib/supabase';
import { AuthResult } from '@/types/auth';
import { parseAuthError } from './parseAuthError';

function getLocaleFromPath(pathname: string): 'en' | 'de' {
  return pathname.startsWith('/de') ? 'de' : 'en';
}

function buildAuthCallbackUrl(origin: string): string {
  return `${origin}/auth/callback`;
}

function persistLocaleCookie(locale: 'en' | 'de') {
  if (typeof document === 'undefined') return;
  document.cookie = `NEXT_LOCALE=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export async function resetPassword(email: string): Promise<AuthResult> {
  try {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Reset password only available on client' };
    }

    const locale = getLocaleFromPath(window.location.pathname);
    persistLocaleCookie(locale);
    const redirectTo = buildAuthCallbackUrl(window.location.origin);

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) return { success: false, error: parseAuthError(error) };

    return { success: true };
  } catch (error) {
    return { success: false, error: parseAuthError(error as Error) };
  }
}
