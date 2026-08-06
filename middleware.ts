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
  // /room/{token} is the in-room "open my booking" QR — same reasoning. The
  // trailing slash matters: '/rooms' is the public catalogue and must keep its
  // locale handling.
  if (pathname.startsWith('/admin') || pathname.startsWith('/auth') || pathname.startsWith('/api') || pathname.startsWith('/checkout') || pathname.startsWith('/room/')) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all pathnames EXCEPT admin, api, auth/callback, checkout and system files.
    // `sitemap` and `robots.txt` MUST be excluded by name: crawlers request them
    // without a locale prefix, so next-intl rewrote /sitemap.xml → /en/sitemap.xml
    // and both returned a 404 HTML page in production — Google could read neither.
    // The extension list must likewise cover every static type served from /public
    // (txt/xml here, plus video/audio/font if any are ever added), or the same
    // rewrite swallows those too.
    '/((?!admin|api|auth/callback|checkout|room/|sitemap|robots.txt|\\.well-known|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|xml|txt)$).*)',
  ],
};
