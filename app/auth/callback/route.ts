import { NextResponse } from 'next/server';
import { PRIVACY_POLICY_VERSION } from "@/lib/Constants"
import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');
  
  // Get locale from query parameter (passed from OAuth init) or fallback to cookie
  const localeFromQuery = requestUrl.searchParams.get('locale');
  const cookieStore = await cookies();
  const locale = localeFromQuery || cookieStore.get('NEXT_LOCALE')?.value || 'en';
  
  const localePrefix = locale === 'en' ? '' : `/${locale}`;
  
  console.log('OAuth callback - Locale from query:', localeFromQuery, 'Final locale:', locale);

  // Handle OAuth errors
  if (error) {
    console.error('Auth callback error:', error, error_description);
    return NextResponse.redirect(
      `${requestUrl.origin}${localePrefix}/?error=${encodeURIComponent(error_description || error)}`
    );
  }

  // Exchange code for session
  if (code) {
    try {
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
          `${requestUrl.origin}${localePrefix}/?error=${encodeURIComponent(exchangeError.message)}`
        );
      }

      const type = requestUrl.searchParams.get('type');
      
      const isRecovery = type === 'recovery';
      
      const hasRecentRecovery = data?.user?.recovery_sent_at && 
        (Date.now() - new Date(data.user.recovery_sent_at).getTime()) < 3600000;
      
      // Staff signing in with Google from /admin/login: the login page sets a
      // short-lived cookie first, because the redirect URL itself must match
      // Supabase's allow-list exactly and cannot carry a "next" parameter.
      //
      // It is spent on the way out of EVERY branch, not only the one that uses
      // it. Abandoning the Google chooser left it live for ten minutes, and the
      // next thing through this callback in the same browser — a guest
      // confirming their sign-up — was redirected to /admin before the code
      // below could sync their e-mail or write their consent row, so that GDPR
      // record silently did not exist.
      const staffLogin = cookieStore.get('admin-after-login')?.value === '1';
      const leave = (url: string) => {
        const res = NextResponse.redirect(url);
        if (staffLogin) res.cookies.set('admin-after-login', '', { path: '/', maxAge: 0 });
        return res;
      };

      // An explicit recovery link always goes to the password page. The
      // "asked for a reset recently" guess does not outrank a staff member who
      // asked for one and then signed in with Google instead.
      if (isRecovery || (hasRecentRecovery && !staffLogin)) {
        return leave(`${requestUrl.origin}${localePrefix}/reset-password`);
      }

      // Check if this is email confirmation
      const isEmailConfirmation = type === 'email_change' || type === 'email';
      
      // If email was confirmed, sync it to profiles table
      if (isEmailConfirmation && data?.user) {
        // Update email in profiles table
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ email: data.user.email })
          .eq('id', data.user.id);
        
        if (updateError) {
          console.error('Failed to sync email to profiles:', updateError);
        }

        // Save consent for registration (GDPR compliance)
        try {
          const headersList = await headers()
          const ip = 
            headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 
            headersList.get('x-real-ip') || 
            'unknown'

          const { data: existingConsent } = await supabase
            .from('consents')
            .select('id')
            .eq('user_id', data.user.id)
            .eq('consent_type', 'registration')
            .single()

          if (!existingConsent) {
            await supabase.from('consents').insert({
              user_id: data.user.id,
              consent_type: 'registration',
              consent_given: true,
              ip_address: ip,
              privacy_policy_version: PRIVACY_POLICY_VERSION,
              consent_date: new Date().toISOString(),
            })
          }
        } catch (consentError) {
          console.error('Failed to save consent:', consentError)
        }
        
        return leave(
          staffLogin
            ? `${requestUrl.origin}/admin`
            : `${requestUrl.origin}${localePrefix}/profile/reservations?email_confirmed=true`,
        );
      }
      
      // Default redirect to reservations for other auth flows (OAuth, etc.)
      return leave(
        staffLogin
          ? `${requestUrl.origin}/admin`
          : `${requestUrl.origin}${localePrefix}/profile/reservations`,
      );
    } catch (err) {
      console.error('Unexpected error during code exchange:', err);
      return NextResponse.redirect(
        `${requestUrl.origin}${localePrefix}/?error=Authentication failed`
      );
    }
  }

  // No code provided - redirect to reservations
  return NextResponse.redirect(`${requestUrl.origin}${localePrefix}/profile/reservations`);
}
