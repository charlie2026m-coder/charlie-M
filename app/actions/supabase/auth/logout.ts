import { supabase } from '@/lib/supabase';
import { AuthResult } from '@/types/auth';
import { parseAuthError } from './parseAuthError';

export async function logout(): Promise<AuthResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const { error } = await supabase.auth.signOut();
      if (error) return { success: false, error: parseAuthError(error) };
    }

    sessionStorage.removeItem('guestMode');
    sessionStorage.removeItem('guestData');

    return { success: true };
  } catch (error) {
    sessionStorage.removeItem('guestMode');
    sessionStorage.removeItem('guestData');
    return { success: false, error: parseAuthError(error as Error) };
  }
}
