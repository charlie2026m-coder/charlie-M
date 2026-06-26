import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n';

const intlMiddleware = createMiddleware({
  locales: locales as unknown as string[],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  localeDetection: false,
});

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // /checkout/{token} is the guest QR self-checkout — locale-free by design
  // (printed QR URLs must stay short; the page has its own DE/EN toggle).
  if (pathname.startsWith('/admin') || pathname.startsWith('/auth') || pathname.startsWith('/api') || pathname.startsWith('/checkout')) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all pathnames EXCEPT admin, api, auth/callback, checkout and system files
    '/((?!admin|api|auth/callback|checkout|\\.well-known|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
