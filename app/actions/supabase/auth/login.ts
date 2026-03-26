import { supabase } from '@/lib/supabase';
import { LoginCredentials, AuthResult } from '@/types/auth';
import { parseAuthError } from './parseAuthError';

export async function login(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) return { success: false, error: parseAuthError(error) };
    if (!data.user) return { success: false, error: 'Login failed. Please try again.' };

    return { success: true };
  } catch (error) {
    return { success: false, error: parseAuthError(error as Error) };
  }
}
