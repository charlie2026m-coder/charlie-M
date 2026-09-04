import * as Sentry from '@sentry/nextjs'
import { baseSentryOptions } from '@/lib/sentryScrub'

/**
 * Sentry on the server and the edge runtime.
 *
 * Next calls register() once per runtime at startup. Without
 * NEXT_PUBLIC_SENTRY_DSN the SDK initialises to a no-op, so this is safe to
 * ship before the Sentry project exists.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init(baseSentryOptions)
  }
}

// Server-side rendering and route-handler errors Next catches itself. Without
// this hook they never reach Sentry.
export const onRequestError = Sentry.captureRequestError
