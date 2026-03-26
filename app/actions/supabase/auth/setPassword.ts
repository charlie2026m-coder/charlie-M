import { supabase } from '@/lib/supabase';
import { AuthResult } from '@/types/auth';
import { parseAuthError } from './parseAuthError';

export async function setPassword(newPassword: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) return { success: false, error: parseAuthError(error) };

    return { success: true };
  } catch (error) {
    return { success: false, error: parseAuthError(error as Error) };
  }
}
