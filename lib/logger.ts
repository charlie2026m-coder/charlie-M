import { createConsola, type ConsolaReporter } from 'consola'
import * as Sentry from '@sentry/nextjs'

// Isomorphic logger — works on server (Vercel logs) and client (DevTools).
// Tagged loggers let us grep by domain: [price-trace], [booking], [adyen], etc.
//
// Never pass PII (email, name, phone, address). Trace prices, IDs, and flow markers only.
const base = createConsola({
  level: process.env.NODE_ENV === 'production' ? 3 : 4,
  formatOptions: {
    date: true,
    colors: true,
  },
})

/**
 * Every logged error also becomes a Sentry issue.
 *
 * This is the whole point of wiring Sentry into this codebase. The money paths
 * deliberately do NOT throw — a refund that fails is caught, written to the log
 * and the request still answers 200, because throwing would undo work that
 * already happened in Apaleo. So Sentry's own capture of unhandled exceptions
 * sees almost none of what matters here: 143 of the ~187 error sites are on
 * payment, folio and webhook paths and every one of them is a caught error.
 *
 * Hooking the logger covers all of them at once, without editing a single call
 * site, and keeps working for sites added later.
 *
 * Warnings become breadcrumbs instead: they cost no quota and give the trail
 * leading up to an error.
 */
const sentryReporter: ConsolaReporter = {
  log(logObj) {
    // consola: fatal/error/fail = 0, warn = 1.
    if (logObj.level > 1) return

    const [first, ...rest] = logObj.args
    const title = typeof first === 'string' ? first : String(first)
    const tag = logObj.tag || 'app'
    // Callers pass one structured object as the second argument.
    const context =
      rest.length && rest[0] && typeof rest[0] === 'object'
        ? (rest[0] as Record<string, unknown>)
        : undefined

    if (logObj.level === 1) {
      Sentry.addBreadcrumb({ category: tag, level: 'warning', message: title, data: context })
      return
    }

    // A real Error anywhere in the arguments carries a stack worth keeping.
    const err = logObj.args.find((a): a is Error => a instanceof Error)

    Sentry.withScope((scope) => {
      scope.setTag('area', tag)
      if (context) scope.setContext('details', context)
      // Group by the static message rather than by whatever ids it carries,
      // so one recurring failure is one issue instead of hundreds.
      scope.setFingerprint([tag, title])
      if (err) {
        scope.setTransactionName(title)
        Sentry.captureException(err)
      } else {
        Sentry.captureMessage(title, 'error')
      }
    })
  },
}

// addReporter, NOT a `reporters` option: passing that to createConsola would
// replace the console reporter and the Vercel logs would go silent.
base.addReporter(sentryReporter)

export const logger = base

export const priceLog = base.withTag('price-trace')
export const bookingLog = base.withTag('booking')
export const adyenLog = base.withTag('adyen')
export const apaleoLog = base.withTag('apaleo')
export const folioLog = base.withTag('folio')
export const paymentAccountLog = base.withTag('payment-account')
export const authorizationLog = base.withTag('authorization')
