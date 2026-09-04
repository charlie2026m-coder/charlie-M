import * as Sentry from '@sentry/nextjs'
import { baseSentryOptions } from '@/lib/sentryScrub'

/**
 * Sentry in the guest's browser.
 *
 * Session Replay is deliberately NOT enabled: it records what the guest sees
 * and types, which on a booking site means their name, address and card form.
 */
Sentry.init({
  ...baseSentryOptions,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
})

// Lets Next report client navigation spans; harmless with tracing off.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
