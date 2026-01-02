import { supabase } from '@/lib/supabase';
import { LoginCredentials, RegisterCredentials, AuthResult } from '@/types/auth';
import { AuthError } from '@supabase/supabase-js';


export function parseAuthError(error: AuthError | Error): string {
  const message = error.message || 'An unexpected error occurred';

  // Check for specific error types
  if (message.includes('Invalid login credentials') || message.includes('Invalid login')) {
    return 'Email address or password is incorrect';
  }
  if (message.includes('Email not confirmed')) return 'Please confirm your email before logging in';
  if (message.includes('already registered') || message.includes('User already registered')) return 'This email is already registered. Please login instead.';
  if (message.includes('Password should be')) return 'Password is too weak. Please use a stronger password.';
  if (message.includes('is invalid') && message.includes('@')) {
    return 'This email address is already registered or not allowed. Please try logging in or use a different email.';
  }

  return message;
}


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

export async function register(credentials: RegisterCredentials): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          full_name: credentials.name,
        },
        emailRedirectTo: typeof window !== 'undefined' 
          ? `${window.location.origin}/auth/callback`
          : undefined,
      },
    });

    if (error) return { success: false, error: parseAuthError(error) };
    if (!data.user) return { success: false, error: 'Registration failed. Please try again.' };

    const requiresEmailConfirmation = !data.session;
    if (data.user.identities && data.user.identities.length === 0) return { success: false, error: 'This email is already registered. Please login instead.' };

    return {
      success: true,
      requiresEmailConfirmation,
    };
  } catch (error) {
    return {
      success: false,
      error: parseAuthError(error as Error),
    };
  }
}

export async function logout(): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) return { success: false, error: parseAuthError(error) };

    return { success: true };
  } catch (error) {
    return { success: false, error: parseAuthError(error as Error) };
  }
}


export async function signInWithOAuth(provider: 'google' | 'apple'): Promise<{ success: boolean; error?: string }> {
  try {
    const redirectTo = typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/callback`
      : undefined;

    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });

    if (error) return { success: false, error: parseAuthError(error) };

    return { success: true };
  } catch (error) {
    return { success: false, error: parseAuthError(error as Error) };
  }
}


// Send password reset email 
export async function resetPassword(email: string): Promise<AuthResult> {
  try {
    const redirectTo = typeof window !== 'undefined' 
      ? `${window.location.origin}/reset-password`
      : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return { success: false, error: parseAuthError(error) };

    return { success: true };
  } catch (error) {
    return { success: false, error: parseAuthError(error as Error) };
  }
}

// Update user password (used for reset password flow)
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) return { success: false, error: parseAuthError(error) };

    // Sign out to invalidate recovery session
    await supabase.auth.signOut();

    return { success: true };
  } catch (error) {
    return { success: false, error: parseAuthError(error as Error) };
  }
}

// Change password (for email/password users - requires current password verification)
export async function changePassword(email: string, currentPassword: string, newPassword: string): Promise<AuthResult> {
  try {
    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (signInError) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) return { success: false, error: parseAuthError(error) };

    return { success: true };
  } catch (error) {
    return { success: false, error: parseAuthError(error as Error) };
  }
}

// Set password (for OAuth users who want to add email/password login)
export async function setPassword(newPassword: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) return { success: false, error: parseAuthError(error) };

    return { success: true };
  } catch (error) {
    return { success: false, error: parseAuthError(error as Error) };
  }
}

