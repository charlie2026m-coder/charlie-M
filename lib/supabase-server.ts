import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for server components
 * Uses cookies for session storage
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore errors in Server Components
            // This can happen when trying to set cookies in middleware
          }
        },
      },
    }
  )
}

/**
 * Gets the current user session
 * @returns user and session or null
 */
export async function getServerSession() {
  const supabase = await createSupabaseServerClient()
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session:', error)
      return { user: null, session: null }
    }

    return {
      user: session?.user ?? null,
      session: session ?? null,
    }
  } catch (error) {
    console.error('Unexpected error getting session:', error)
    return { user: null, session: null }
  }
}

/**
 * Checks if user is authenticated
 * Use in server components to protect pages
 */
export async function requireAuth() {
  const { user, session } = await getServerSession()
  
  if (!user || !session) {
    return { authenticated: false, user: null, session: null }
  }

  return { authenticated: true, user, session }
}

