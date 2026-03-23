# Known Issues & Technical Debt

> Last updated: 2026-03-23
> Status legend: 🔴 Critical | 🟠 High | 🟡 Medium | ✅ Fixed

---

## 🔴 Critical

### [ISSUE-01] Adyen hardcoded to TEST environment
**File:** `app/api/payments/make-payment/route.ts`, `payment-details/route.ts`, `payment-methods/route.ts`
**Problem:** `environment: EnvironmentEnum.TEST` is hardcoded in all three payment routes. Real payments are never charged even in production.
**Fix:** Replace with `process.env.ADYEN_ENVIRONMENT` and set it to `live` in production.
**Status:** 🔴 Open

---

### [ISSUE-02] All API routes are publicly accessible — no authentication
**Files:**
- `app/api/payments/make-payment/route.ts`
- `app/api/payments/payment-details/route.ts`
- `app/api/payments/payment-methods/route.ts`
- `app/api/bookings/create/route.ts`
- `app/api/reservations/[id]/route.ts`
- `app/api/reservations/[id]/full/route.ts`
- `app/api/reservations/[id]/booker-address/route.ts`
- `app/api/reservations/[id]/cancel/route.ts`
- `app/api/services/route.ts`
- `app/api/check-in/route.ts`
- `app/api/bookings/search/route.ts`
- `app/api/reservations/search-booking/route.ts`

**Problem:** None of these routes verify the caller's identity. Anyone can cancel any reservation, modify guest data, initiate payments, or add/remove services.
**Fix:** Add `supabase.auth.getUser()` check at the top of each route. Return 401 if no valid session.
**Status:** 🔴 Open

---

### [ISSUE-03] Middleware bypasses auth for /admin and /api
**File:** `middleware.ts` lines 17–19
**Problem:**
```ts
if (pathname.startsWith('/admin') || pathname.startsWith('/auth') || pathname.startsWith('/api')) {
  return NextResponse.next(); // no auth check at all
}
```
Admin panel has zero authentication at the middleware level. All API routes are fully open.
**Fix:** Remove `/admin` from the bypass list. Add a separate admin session check for `/admin` routes.
**Status:** 🔴 Open

---

## 🟠 High

### [ISSUE-04] 60+ console.log statements expose PII in production logs
**Files:** All files under `app/api/`
**Examples:**
- `app/api/bookings/create/route.ts` lines 43, 79, 116, 129, 166, 174 — logs full booking payload with guest emails and personal data
- `app/api/payments/make-payment/route.ts` line 43 — logs Adyen payment response
- `app/api/reservations/[id]/route.ts` line 19 — logs full reservation object
- `app/api/bookings/search/route.ts` lines 32, 37 — logs search results with PII

**Problem:** Guest names, emails, reservation IDs, and payment responses are logged and visible in production server logs.
**Fix:** Remove all `console.log` from API routes. Keep only `console.error` for actual errors, and sanitize the error objects before logging (strip PII).
**Status:** 🟠 Open

---

### [ISSUE-05] Apaleo token caching has conflicting expiry logic
**Files:** `app/api/apaleo.ts` line 67, `services/Request.ts` line 42
**Problem:** Two separate token caches with different expiry calculations:
- `apaleo.ts`: uses `tokenData.expires_in * 1000` from server response
- `Request.ts`: hardcodes `3600 * 1000` (1 hour)

One of them will always use stale or prematurely-expired tokens.
**Fix:** Consolidate into a single token manager module. Use server-provided `expires_in` with a 60s buffer.
**Status:** 🟠 Open

---

### [ISSUE-06] No input validation on POST/PATCH API routes
**Files:**
- `app/api/bookings/create/route.ts` line 114 — no validation of `booking` object
- `app/api/payments/make-payment/route.ts` lines 12–13 — payment amount not validated (could be 0 or negative)
- `app/api/reservations/[id]/booker-address/route.ts` line 12 — no validation of guest data structure
- `app/api/services/route.ts` lines 32–50 — no validation of service objects or dates
- `app/api/check-in/route.ts` line 9 — no validation of `reservationId` format

**Fix:** Add Zod validation at the start of each route handler. Schemas already exist in `types/schemas.ts` — extend and reuse them.
**Status:** 🟠 Open

---

### [ISSUE-07] Error responses leak internal API details
**Files:**
- `app/api/payments/make-payment/route.ts` line 49 — returns raw `error.message` to client
- `app/api/reservations/[id]/booker-address/route.ts` line 67 — returns raw Apaleo error text
- `app/api/reservations/[id]/cancel/route.ts` line 16 — no context in error

**Fix:** Return generic error messages to the client. Log the real error server-side.
**Status:** 🟠 Open

---

## 🟡 Medium

### [ISSUE-08] Missing HTTP security headers
**File:** `next.config.ts`
**Problem:** No CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy headers configured.
**Fix:** Add `headers()` section to `next.config.ts` with standard security headers.
**Status:** 🟡 Open

---

### [ISSUE-09] `as any` type casting in Adyen payment routes
**File:** `app/api/payments/make-payment/route.ts` lines 24–25
**Problem:**
```ts
shopperInteraction: "Ecommerce" as any,
recurringProcessingModel: "UnscheduledCardOnFile" as any,
```
Bypasses TypeScript safety. If Adyen changes their types, errors won't be caught at compile time.
**Fix:** Use proper Adyen enum types from `@adyen/api-library`.
**Status:** 🟡 Open

---

### [ISSUE-10] Supabase cookie errors silently swallowed
**File:** `lib/supabase-server.ts` lines 24–27
**Problem:**
```ts
} catch {
  // Ignore errors in Server Components
}
```
If cookie setting fails (e.g., headers already sent), auth state silently desyncs with no indication.
**Fix:** At minimum log the error. Consider surfacing it in development mode.
**Status:** 🟡 Open

---

### [ISSUE-11] Zustand store persists unvalidated complex objects
**File:** `store/useBookingStore.ts` lines 149–161
**Problem:** The entire `booking` object (including nested reservations, services, payment refs) is persisted to localStorage via the `persist` middleware with no schema validation or migration strategy. Stale/malformed data from a previous session can corrupt the booking flow on next load.
**Fix:** Add a `version` field and `migrate()` function to the persist config. Validate the hydrated state against a Zod schema before using it.
**Status:** 🟡 Open

---

### [ISSUE-12] Booking search endpoints allow guest data enumeration
**Files:** `app/api/bookings/search/route.ts`, `app/api/reservations/search-booking/route.ts`
**Problem:** Both endpoints accept `externalCode` + `lastName` with no rate limiting or auth. An attacker can enumerate reservation IDs and guest names by brute force.
**Fix:** Add rate limiting (e.g., via Vercel middleware or upstash/ratelimit). Require at minimum a valid session or add CAPTCHA.
**Status:** 🟡 Open

---

### [ISSUE-13] Image domain configured with wildcard
**File:** `next.config.ts` lines 12–13
**Problem:** `*.supabase.co` allows serving images from any Supabase project, not just this one.
**Fix:** Replace with the exact project hostname: `sbohsfnalbugtasmzemo.supabase.co`.
**Status:** 🟡 Open

---

---

## Next.js App Router — Structural Violations

> These are architecture/best-practice issues specific to Next.js 15 App Router.

---

### [ISSUE-14] Excessive `'use client'` — ~68% of components are Client Components
**Problem:** Around 145 out of ~211 components are marked `'use client'`. Most of them don't need it — they have no interactivity, no hooks, no browser APIs. This defeats the purpose of React Server Components: larger JS bundle, slower FCP, unnecessary re-renders.
**Examples:**
- `app/_components/header/Header.tsx` — only renders navigation and static data
- `app/[locale]/home/components/CheckInForm.tsx` — could be a Server Component wrapper with a small client input
- `app/[locale]/profile/page.tsx` — page-level `'use client'` when only a small part is interactive

**Fix:** Push `'use client'` as deep as possible in the component tree. Only leaf components with `useState`, `useEffect`, or event handlers need it.
**Status:** 🟠 Open

---

### [ISSUE-15] Data fetching inside Client Components (should be Server Components)
**Problem:** Multiple pages fetch data inside Client Components via `useEffect` + `fetch`. This means the data waterfall starts only after JS hydrates on the client — increasing time-to-content significantly.
**Files:**
- `app/[locale]/booking/[id]/payment/components/PaymentForm.tsx` — fetches `/api/payments/payment-methods` in `useEffect`
- `app/[locale]/profile/reservations/[id]/payment/components/PaymentForm.tsx` — multiple fetches in Client Component
- `app/_components/Auth/ReservationForm.tsx` — fetch in client component

**Fix:** Move data fetching to Server Components (async page/layout). Pass data as props to Client Components. Use Server Actions for mutations.
**Status:** 🟠 Open

---

### [ISSUE-16] `generateMetadata` re-fetches data already fetched by the page
**Problem:** `generateMetadata` and the page component both call the same service function independently, causing the same data to be fetched twice per request.
**Files:**
- `app/[locale]/rooms/page.tsx` — `generateMetadata` calls `getAvailableRooms`, then the page calls it again
- `app/[locale]/rooms/[id]/page.tsx` — `generateMetadata` calls `getSingleRoom`, page calls it again

**Fix:** Wrap service functions with React's `cache()`. `getSingleRoom` already does this — apply the same pattern everywhere.
**Status:** 🟡 Open

---

### [ISSUE-17] No `error.tsx` files for any route segment
**Problem:** If a Server Component throws, Next.js has no error boundary to catch it — the entire page crashes with no recovery UI. Currently only `app/not-found.tsx` exists.
**Missing in:**
- `app/[locale]/rooms/`
- `app/[locale]/booking/`
- `app/[locale]/profile/`
- `app/[locale]/home/`
- `app/admin/`

**Fix:** Add `error.tsx` with `'use client'` and a retry button to each major route segment.
**Status:** 🟠 Open

---

### [ISSUE-18] No `loading.tsx` files for any route segment
**Problem:** During Server Component data fetching there's no streaming skeleton shown to the user — the page just hangs blank until all data resolves.
**Fix:** Add `loading.tsx` with skeleton UI to `rooms/`, `booking/[id]/`, `profile/`, and `profile/reservations/[id]/`.
**Status:** 🟡 Open

---

### [ISSUE-19] Auth check in Middleware makes DB call on every request
**File:** `middleware.ts` lines 24–48
**Problem:** Middleware creates a Supabase client and calls `supabase.auth.getSession()` for every request to `/profile`. Middleware runs on the Edge — it should be fast and stateless. Any latency here blocks all page loads.
**Fix:** Move the auth redirect logic into `app/[locale]/profile/layout.tsx` as a Server Component. Check `getUser()` there and redirect if no session. Middleware should only handle i18n routing.
**Status:** 🟡 Open

---

### [ISSUE-20] No route groups — auth pages mixed with public pages
**Problem:** Login, signup, forgot-password, and reset-password pages share the same `[locale]` layout as the main site. They likely need a different layout (no header/footer) but currently can't have one without route groups.
**Current structure:**
```
app/[locale]/
├── login/
├── signup/
├── forgot-password/
├── reset-password/
├── rooms/        ← public, needs full layout
├── booking/      ← booking flow, needs full layout
└── profile/      ← protected, needs full layout
```
**Fix:** Use route groups to apply different layouts:
```
app/[locale]/
├── (auth)/          ← minimal layout, no header
│   ├── login/
│   ├── signup/
│   └── forgot-password/
├── (main)/          ← full layout with header/footer
│   ├── rooms/
│   └── booking/
└── (protected)/     ← full layout + server-side auth guard
    └── profile/
```
**Status:** 🟡 Open

---

### [ISSUE-21] Booking state stored in localStorage instead of URL or server
**File:** `store/useBookingStore.ts`
**Problem:** The entire multi-step booking flow state (selected room, guests, services, dates) lives in Zustand persisted to localStorage. This causes:
- SSR/hydration mismatch (the `typeof window === 'undefined'` guard is a symptom)
- State survives browser refresh unexpectedly
- Not shareable via URL
- Breaks "back" button behavior

**Fix:** For a multi-step booking flow, use URL search params (`?room=CMH-SGB&from=2026-04-01`) for shareable/bookmarkable state, and a temporary server-side session (Supabase) for payment data.
**Status:** 🟠 Open

---

## ✅ Fixed

_Nothing fixed yet._

---

## Fix Priority Order

| # | Issue | Category | Impact |
|---|-------|----------|--------|
| 1 | ISSUE-01 | Security | Payments not working in production |
| 2 | ISSUE-02 | Security | Any user can cancel/modify any booking |
| 3 | ISSUE-03 | Security | Admin panel unprotected |
| 4 | ISSUE-04 | Security | GDPR risk — PII in logs |
| 5 | ISSUE-06 | Security | Data integrity & abuse risk |
| 6 | ISSUE-17 | Next.js | No error recovery on page crash |
| 7 | ISSUE-15 | Next.js | Client-side data fetching waterfall |
| 8 | ISSUE-14 | Next.js | Bundle size, performance |
| 9 | ISSUE-05 | Backend | Intermittent Apaleo auth failures |
| 10 | ISSUE-21 | Next.js | Booking state hydration bugs |
| 11 | ISSUE-07 | Security | Info disclosure to attackers |
| 12 | ISSUE-08 | Security | Security headers missing |
| 13 | ISSUE-18 | Next.js | No loading skeletons |
| 14 | ISSUE-19 | Next.js | Slow middleware on every request |
| 15 | ISSUE-09 — ISSUE-13, ISSUE-16, ISSUE-20 | Tech debt | Code quality & architecture |
