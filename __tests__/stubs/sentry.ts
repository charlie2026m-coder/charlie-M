/**
 * Sentry, stubbed for tests.
 *
 * `lib/logger.ts` imports @sentry/nextjs at module scope, and almost every
 * service imports the logger. Under vitest that import chain reaches
 * @sentry/server-utils, which loads a vendored webpack plugin that calls
 * fileURLToPath on something that is not a file URL and throws
 * ERR_INVALID_URL_SCHEME. The suite never gets as far as running a test: 13 of
 * 29 files died on import, on CI and locally alike.
 *
 * Tests have no use for real error reporting — nobody asserts on a Sentry
 * call — so the honest fix is to keep the bundler plugin out of the test module
 * graph entirely rather than to reshape production code around a test runner.
 * vitest.config.ts aliases the package here; the app is untouched.
 *
 * Only the four APIs lib/logger.ts actually calls are stubbed. A fifth one
 * appearing here as `undefined is not a function` is the right failure: it says
 * "the logger grew a new Sentry call" rather than silently doing nothing.
 */

export const captureException = (_error: unknown): string => 'test-event-id'
export const captureMessage = (_message: string, _level?: unknown): string => 'test-event-id'
export const addBreadcrumb = (_breadcrumb: unknown): void => {}

interface StubScope {
  setTag: (key: string, value: unknown) => StubScope
  setContext: (key: string, value: unknown) => StubScope
  setFingerprint: (fingerprint: string[]) => StubScope
  setTransactionName: (name: string) => StubScope
  setLevel: (level: unknown) => StubScope
  setExtra: (key: string, value: unknown) => StubScope
  setUser: (user: unknown) => StubScope
}

/** Hands the callback a scope whose setters all chain, like the real one. */
export const withScope = (callback: (scope: StubScope) => void): void => {
  const scope: StubScope = {
    setTag: () => scope,
    setContext: () => scope,
    setFingerprint: () => scope,
    setTransactionName: () => scope,
    setLevel: () => scope,
    setExtra: () => scope,
    setUser: () => scope,
  }
  callback(scope)
}
