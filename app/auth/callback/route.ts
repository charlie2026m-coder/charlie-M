import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('Auth callback error:', error, error_description);
    return NextResponse.redirect(
      `${requestUrl.origin}/?error=${encodeURIComponent(error_description || error)}`
    );
  }

  // Exchange code for session
  if (code) {
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        return NextResponse.redirect(
          `${requestUrl.origin}/?error=${encodeURIComponent(exchangeError.message)}`
        );
      }

      // Check if this is a password recovery flow
      const next = requestUrl.searchParams.get('next');
      
      if (next?.includes('/reset-password')) {
        return NextResponse.redirect(`${requestUrl.origin}/reset-password`);
      }

      // Successful authentication - redirect to home or specified next URL
      return NextResponse.redirect(next || requestUrl.origin);
    } catch (err) {
      console.error('Unexpected error during code exchange:', err);
      return NextResponse.redirect(
        `${requestUrl.origin}/?error=Authentication failed`
      );
    }
  }

  // No code provided - redirect to home
  return NextResponse.redirect(requestUrl.origin);
}

