import type { ErrorEvent, EventHint } from '@sentry/nextjs'

/**
 * What Sentry is allowed to keep.
 *
 * This is a hotel: everything it touches is guest data, and adding an error
 * tracker adds a processor of it. The logger's own rule is already "never pass
 * PII — trace prices, IDs and flow markers only", but Sentry attaches things
 * the logger never sees: request headers, cookies, query strings, IP. Those are
 * stripped here rather than trusted not to appear.
 *
 * Reservation ids and amounts are deliberately KEPT. They are what makes an
 * error actionable, and they identify a booking rather than a person.
 */

// Matches an address anywhere in a string, including inside a longer message.
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g
// Long digit runs: card-ish and phone-ish. Reservation ids are letters + "-1"
// and psp references are alphanumeric, so both survive. Cent amounts do too —
// seven digits is 10.000,00 EUR, well past any single stay.
const LONG_DIGITS = /\b\d{7,}\b/g

export function scrubText(value: string): string {
  return value.replace(EMAIL, '[email]').replace(LONG_DIGITS, '[number]')
}

/**
 * Field names that are personal on their own, matched as whole words.
 *
 * Whole words, not substrings: "tel" lives inside "hotelId", "ip" inside
 * "skipped", "mail" inside "mailgunStatus". A substring rule redacts exactly
 * the fields someone opened the issue to read.
 */
const PERSONAL_WORDS = new Set([
  'email',
  'mail',
  'phone',
  'telephone',
  'mobile',
  'address',
  'street',
  'housenumber',
  'postcode',
  'postal',
  'postalcode',
  'zip',
  'zipcode',
  'birthdate',
  'birthday',
  'dob',
  'iban',
  'cvc',
  'cvv',
  'pan',
  'cardnumber',
  'ssn',
  'passport',
  'ip',
])

/**
 * "name" is only personal next to one of these. `unitName`, `ratePlanName` and
 * `serviceName` are the vocabulary of this codebase and must stay readable.
 */
const PERSON_QUALIFIERS = new Set([
  'first',
  'last',
  'full',
  'middle',
  'given',
  'family',
  'sur',
  'guest',
  'customer',
  'holder',
  'booker',
  'payer',
  'contact',
])

/** camelCase, snake_case and kebab-case all reduce to lowercase words. */
function keyWords(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .map((w) => w.toLowerCase())
    .filter(Boolean)
}

export function isPersonalField(key: string): boolean {
  const words = keyWords(key)
  // `postalCode` and `houseNumber` are personal as a phrase but not as either
  // word alone, so the joined form is checked too.
  if (PERSONAL_WORDS.has(words.join(''))) return true
  return words.some(
    (word, i) =>
      PERSONAL_WORDS.has(word) ||
      (word === 'name' && (words.length === 1 || PERSON_QUALIFIERS.has(words[i - 1]))),
  )
}

export function scrubDeep(value: unknown, depth = 0): unknown {
  if (depth > 6) return value
  if (typeof value === 'string') return scrubText(value)
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Drop the field outright when its NAME says it is personal — the value
      // may not look like an address (a first name, a house number).
      out[k] = isPersonalField(k) ? '[redacted]' : scrubDeep(v, depth + 1)
    }
    return out
  }
  return value
}

/**
 * Runs on every event before it leaves the process. Returning null drops it.
 */
export function beforeSend(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
  // Request metadata: none of it is needed to fix a bug here, and all of it
  // can carry the guest.
  if (event.request) {
    delete event.request.cookies
    delete event.request.headers
    delete event.request.data
    delete event.request.query_string
    // The path can hold a reservation id, which we want, but a query string can
    // hold a token.
    if (typeof event.request.url === 'string') {
      event.request.url = scrubText(event.request.url.split('?')[0])
    }
  }
  delete event.user

  if (event.message) event.message = scrubText(event.message)
  if (event.extra) event.extra = scrubDeep(event.extra) as Record<string, unknown>
  if (event.contexts) event.contexts = scrubDeep(event.contexts) as typeof event.contexts

  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrubText(ex.value)
  }
  for (const crumb of event.breadcrumbs ?? []) {
    if (crumb.message) crumb.message = scrubText(crumb.message)
    if (crumb.data) crumb.data = scrubDeep(crumb.data) as Record<string, unknown>
  }

  return event
}

/** Shared by the server, edge and browser inits. */
export const baseSentryOptions = {
  // No DSN — for example on a preview deploy or a developer machine — makes the
  // SDK a no-op rather than an error. That is why this can ship before the
  // project exists.
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Errors only. Performance tracing would burn the quota on a site this size
  // without answering a question anyone is asking yet.
  tracesSampleRate: 0,
  // Never attach IP, cookies or headers automatically.
  sendDefaultPii: false,
  beforeSend,
}
