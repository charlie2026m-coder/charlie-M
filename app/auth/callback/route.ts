import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            },
          },
        }
      );

      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
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

      // Check if this is email confirmation
      const type = requestUrl.searchParams.get('type');
      const isEmailConfirmation = type === 'email_change' || type === 'email';
      
      // If email was confirmed, sync it to profiles table
      if (isEmailConfirmation && data?.user) {
        console.log('Email confirmed, syncing to profiles:', data.user.email);
        
        // Update email in profiles table
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ email: data.user.email })
          .eq('id', data.user.id);
        
        if (updateError) {
          console.error('Failed to sync email to profiles:', updateError);
        }
        
        return NextResponse.redirect(`${requestUrl.origin}/profile?email_confirmed=true`);
      }
      
      return NextResponse.redirect(next || `${requestUrl.origin}/profile`);
    } catch (err) {
      console.error('Unexpected error during code exchange:', err);
      return NextResponse.redirect(
        `${requestUrl.origin}/?error=Authentication failed`
      );
    }
  }

  // No code provided - redirect to home
  return NextResponse.redirect(`${requestUrl.origin}/profile`);
}
