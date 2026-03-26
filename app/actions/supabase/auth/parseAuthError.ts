import { AuthError } from '@supabase/supabase-js';

export function parseAuthError(error: AuthError | Error): string {
  const message = error.message || 'An unexpected error occurred';

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
