import { supabase } from '@/lib/supabase'

/**
 * Every guest-facing entry point that opens a reservation without a registered
 * account (the "continue with reservation ID" form, the in-room QR, the room
 * token page) needs a Supabase user first: the server links the verified
 * reservation to `reservations.user_id`, and the ownership-gated routes read it
 * back. For a guest that user is an ANONYMOUS one.
 *
 * All three used to inline `getSession()` + `signInAnonymously()` and collapse
 * every failure into one opaque message, which made a project-level
 * misconfiguration look like a random glitch. Centralised here so the caller
 * gets a reason it can actually show — and so the cause lands in the console
 * once, in a form that names the fix.
 */
export type GuestSessionResult =
  | { ok: true }
  | { ok: false; reason: 'anonymous_disabled' | 'rate_limited' | 'network' | 'unknown' }

type SupabaseAuthError = { message?: string; status?: number; code?: string }

function classify(error: SupabaseAuthError): Exclude<GuestSessionResult, { ok: true }>['reason'] {
  const code = error.code ?? ''
  const message = (error.message ?? '').toLowerCase()

  // The provider is off in the Supabase project (Authentication → Sign In /
  // Providers → "Allow anonymous sign-ins"). Nothing the client can retry.
  if (code === 'anonymous_provider_disabled' || message.includes('anonymous sign-ins are disabled')) {
    return 'anonymous_disabled'
  }
  if (error.status === 429 || code === 'over_request_rate_limit') return 'rate_limited'
  // supabase-js wraps fetch failures in AuthRetryableFetchError with status 0.
  if (error.status === 0 || code === 'over_email_send_rate_limit') return 'network'
  return 'unknown'
}

export async function ensureGuestSession(): Promise<GuestSessionResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) return { ok: true }

    const { error } = await supabase.auth.signInAnonymously()
    if (!error) return { ok: true }

    const reason = classify(error as SupabaseAuthError)

    if (reason === 'anonymous_disabled') {
      console.error(
        'Guest sign-in is impossible: anonymous sign-ins are disabled for this Supabase project. ' +
          'Enable Authentication → Sign In / Providers → "Allow anonymous sign-ins".'
      )
    } else {
      console.error('Error creating anonymous session:', error)
    }

    return { ok: false, reason }
  } catch (error) {
    console.error('Error creating anonymous session:', error)
    return { ok: false, reason: 'network' }
  }
}
