import { supabase } from '@/lib/supabase';
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

export async function signInWithOAuth(provider: 'google' | 'apple'): Promise<{ success: boolean; error?: string }> {
  try {
    let redirectTo: string | undefined;

    if (typeof window !== 'undefined') {
      const locale = getLocaleFromPath(window.location.pathname);
      persistLocaleCookie(locale);
      redirectTo = buildAuthCallbackUrl(window.location.origin);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (error) return { success: false, error: parseAuthError(error) };

    return { success: true };
  } catch (error) {
    return { success: false, error: parseAuthError(error as Error) };
  }
}
