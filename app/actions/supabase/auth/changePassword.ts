import { supabase } from '@/lib/supabase';
import { AuthResult } from '@/types/auth';
import { parseAuthError } from './parseAuthError';

export async function changePassword(email: string, currentPassword: string, newPassword: string): Promise<AuthResult> {
  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (signInError) return { success: false, error: 'Current password is incorrect' };

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) return { success: false, error: parseAuthError(error) };

    return { success: true };
  } catch (error) {
    return { success: false, error: parseAuthError(error as Error) };
  }
}
