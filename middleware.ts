import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware for route protection
 * Checks for active session before allowing access to protected pages
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Check session
  const { data: { session }, error } = await supabase.auth.getSession()

  // If no session, redirect to home
  if (!session || error) {
    const redirectUrl = new URL('/', request.url)
    // Add auth param to show sign in modal (optional)
    redirectUrl.searchParams.set('auth', 'signin')
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

/**
 * Defines which routes the middleware applies to
 * Protecting only profile page (booking is accessible without auth)
 */
export const config = {
  matcher: [
    '/profile/:path*',
  ],
}

