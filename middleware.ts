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
  
  // Skip i18n for admin panel entirely - no locale routing for admin
  if (pathname.startsWith('/admin')) {
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
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('auth', 'signin')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    // Match all pathnames EXCEPT admin, api and system files
    '/((?!admin|api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
