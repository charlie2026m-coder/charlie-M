import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n';

// Create i18n middleware
const intlMiddleware = createMiddleware({
  locales: locales as unknown as string[],
  defaultLocale: 'en',
  localePrefix: 'as-needed', // English without prefix, German with /de
  localeDetection: false // Disable automatic locale detection from browser
});

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip i18n for admin panel and auth routes - no locale routing needed
  if (pathname.startsWith('/admin') || pathname.startsWith('/auth')) {
    return NextResponse.next();
  }
  
  // Apply i18n middleware for all other routes
  const response = intlMiddleware(request);
  
  // Check if route needs auth protection (only for user-facing routes)
  if (pathname.match(/^\/(de\/)?profile/)) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
            // Can't set cookies on intl middleware response
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        const locale = pathname.match(/^\/(de|en)/) ? pathname.split('/')[1] : 'en'
        const redirectUrl = new URL(`/${locale}/login`, request.url)
        return NextResponse.redirect(redirectUrl)
      }
  }

  return response
}

export const config = {
  matcher: [
    // Match all pathnames EXCEPT admin, api, auth/callback and system files
    '/((?!admin|api|auth/callback|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
