import { supabase } from '@/lib/supabase';
import { RegisterCredentials, AuthResult } from '@/types/auth';
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

export async function register(credentials: RegisterCredentials): Promise<AuthResult> {
  try {
    if (typeof window !== 'undefined') {
      persistLocaleCookie(getLocaleFromPath(window.location.pathname));
    }

    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          full_name: credentials.name,
        },
        emailRedirectTo:
          typeof window !== 'undefined'
            ? buildAuthCallbackUrl(window.location.origin)
            : undefined,
      },
    });

    if (error) return { success: false, error: parseAuthError(error) };
    if (!data.user) return { success: false, error: 'Registration failed. Please try again.' };

    const requiresEmailConfirmation = !data.session;
    if (data.user.identities && data.user.identities.length === 0) {
      return { success: false, error: 'This email is already registered. Please login instead.' };
    }

    return { success: true, requiresEmailConfirmation };
  } catch (error) {
    return { success: false, error: parseAuthError(error as Error) };
  }
}
