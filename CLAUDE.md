# CharlieM — Agent Spec

> 5★ aparthotel **Charlie M** at Friedrichstraße 33, Berlin 10969. 125 contactless rooms.
> **Production:** `https://www.charlie-m.de`
> Read `../CLAUDE.md` first — this file documents only what's CharlieM-specific.
> Pair with `ISSUES.md` for the open debt list (referenced inline below).

---

## Identity (exact values)

| | Value |
|---|---|
| Apaleo property | `CMH` |
| Apaleo account | `RKAA` (shared with Motz19) |
| Adyen merchant | `ApaleoGmbHCOM` |
| Adyen environment | `test` (controlled by `NEXT_PUBLIC_ADYEN_ENVIRONMENT`) |
| Adyen HMAC | optional — if `ADYEN_HMAC_KEY` unset, webhook skips signature check (dev mode) |
| Supabase project | `https://sbohsfnalbugtasmzemo.supabase.co` |
| Zustand persist key | `charlie-booking-storage` (version `1`) |
| Translations folder | `messages/` (NOT `language/`) |
| Git branches | `dev` (semantic-release source) → `main` |
| Public success URL | `/booking/[id]/payment/success` (nested in payment layout) |

Full diff vs Motz19 → `../docs/differences.md`.

---

## Routing model — `app/` tree

```
app/
├── [locale]/                                  # i18n (en default no-prefix, /de/)
│   ├── (auth)/                                # login, signup, forgot-password, reset-password
│   ├── (main)/                                # booking, rooms, imprint, privacy-policy, terms
│   │   └── booking/[id]/
│   │       ├── page.tsx                       # main booking page
│   │       └── payment/
│   │           ├── layout.tsx
│   │           └── success/page.tsx           # ← post-payment landing (no /welcome/ route)
│   ├── (protected)/profile/**                 # auth gate in layout.tsx (NOT middleware)
│   └── _home/                                 # landing sections (Concept, Design, FAQ, etc.)
├── admin/                                     # ⚠️ NOT under [locale], NOT auth-gated at layout (ISSUE-03)
├── api/**                                     # all server endpoints
├── auth/callback/route.ts                     # OAuth + email confirm callback
├── _components/**                             # all client UI
├── actions/**                                 # mix of Server Actions + utility functions (see below)
└── hooks/**                                   # TanStack Query hooks
```

**`middleware.ts`** runs only `next-intl` i18n. Lines 15–19: bypasses `/admin`, `/api`, `/auth/callback`. Auth is enforced **only** at `(protected)/layout.tsx` line 13–17 (redirects to `/login` if no user).

**No `[...rest]` catch-all.** Adding new top-level routes is safe.

---

## Apaleo integration — where each call lives

The current code splits Apaleo work across **three** places (not two). When adding a new call, follow the existing pattern:

### Token + Fetch wrapper (single source of truth)

`services/Request.ts`:
- `getOrRefreshToken()` line 36–46 — caches OAuth token for 1h
- `Fetch<T>(endpoint, options?, retry)` line 49–76 — auto-refreshes on 401, retries once

**Always import `Fetch` from `@/services/Request`. Never call `api.apaleo.com` directly.**

### Server Actions (`'use server'` — call from client components)

| File | Purpose |
|---|---|
| `app/actions/apaleo/rooms/getRoomPrice.ts` | single-room price |
| `app/actions/apaleo/rooms/getPrices.ts` | batch min prices for landing/listing |
| `app/actions/revalidateRooms.ts` | invalidate room cache after admin edit |

### Server-side helpers (no `'use server'` — RSC / API routes only)

| File | Apaleo endpoint |
|---|---|
| `app/actions/apaleo/rooms/getRooms.ts` | `/booking/v1/offers` (availability) |
| `app/actions/apaleo/rooms/getRoom.ts` | single room offer |
| `app/actions/apaleo/services/getExtras.ts` | services catalogue |
| `services/apaleo/rooms.ts` | offers (alternate path used in some RSC) |
| `services/getSingleRoom.ts` | single room incl. unit info |
| `services/getReservation.ts` | reservation read |
| `services/getUnit.ts` | unit floor/inventory |
| `services/bookReservationServices.ts` | book + pay services to folio |

### Inline `Fetch()` inside API routes (writes & ops)

- `app/api/bookings/create/route.ts` — POST `/booking/v1/bookings`
- `app/api/bookings/search/route.ts` — search bookings
- `app/api/reservations/route.ts` — list/search
- `app/api/reservations/[id]/route.ts` — read
- `app/api/reservations/[id]/full/route.ts` — full object
- `app/api/reservations/[id]/cancel/route.ts` — DELETE
- `app/api/reservations/[id]/booker-address/route.ts` — PATCH guest address
- `app/api/reservations/search-reservation/route.ts`, `search-booking/route.ts`
- `app/api/services/route.ts` — add/remove services on a reservation
- `app/api/unit/[id]/route.ts` — singular `unit/` (Motz19 uses plural `units/`)
- `app/api/invoice/create/route.ts`, `app/api/invoice/folio/route.ts`

### Dead code

- `lib/apaleo.ts` — legacy token helpers. **Zero imports anywhere.** Don't use, don't extend. Tracked as ISSUE-05 (caching conflict risk if ever re-imported).

---

## Adyen integration

### Payment endpoints (env-driven since 2026-03-23)

`app/api/payments/`:
- `make-payment/route.ts` line 4–11 — reads `NEXT_PUBLIC_ADYEN_ENVIRONMENT` and selects `EnvironmentEnum.LIVE` or `TEST` (ISSUE-01: **fixed**)
- `payment-methods/route.ts` — POSTs to Adyen checkout API
- `payment-details/route.ts` — `paymentDetails` for 3DS / async results

No `lib/adyen.ts` — `@adyen/api-library` clients are constructed inline per route.

### Webhook (`app/api/webhooks/adyen/route.ts` — read fully before touching)

- Line 9–14: builds **service_role** Supabase client with `SUPABASE_SERVICE_ROLE_KEY` (correct — webhook has no user session)
- Line 20–52: HMAC verification via `ADYEN_HMAC_KEY`. **If key absent, verification is skipped** (dev). For production with HMAC enabled, signature mismatch → `401`.
- On `AUTHORISATION` + `success=true`:
  1. `createBookingFromPending(pendingId)` → Apaleo `POST /booking/v1/bookings`, then pay each folio
  2. `addServicesFromPending(reservationIds, pendingServices)` → adds pre-selected services to folio
  3. Marks `pending_bookings.status = 'completed'` and writes `bookings` row
- On Apaleo failure: calls `reversePayment(pspReference)` to **automatically refund/cancel** the customer
- Always returns plaintext `[accepted]` (Adyen requirement) line 271–273

### Refund / cancel flow

`app/actions/adyen/reversePayment.ts`:
- Uses `@adyen/api-library` `CheckoutAPI.modificationsApi.refundOrCancelPayment(pspReference, { merchantAccount })`
- Adyen decides cancel vs refund based on settlement state — result arrives async via webhook (CANCEL or REFUND event types)
- Called from the webhook on Apaleo failure AND from user-initiated cancel flows

### Drop-in client init

Drop-in fetches payment methods via `/api/payments/payment-methods` on mount; client key from `NEXT_PUBLIC_ADYEN_CLIENT_KEY`.

---

## Supabase clients & service_role usage

### Three clients

| File | Client | Used in |
|---|---|---|
| `lib/supabase.ts` | browser (anon) | client components |
| `lib/supabase-server.ts` | server (anon + cookies) | RSC, layouts, route handlers with user session |
| inline `createClient(... SERVICE_ROLE_KEY ...)` | admin | listed below |

### Service-role usage — exhaustive list

1. `app/api/webhooks/adyen/route.ts` line 9–14 — Adyen webhook
2. `app/api/bookings/create/route.ts` — idempotency lock + insert
3. `app/api/bookings/save-pending/route.ts` — `pending_bookings` write
4. `app/api/account/delete/route.ts` — GDPR account deletion

If you add another route that writes to `bookings` / `pending_bookings` from no-user context, it MUST use service_role — RLS blocks anon/authenticated writes by design.

---

## Server Actions — actually marked `'use server'`

Only these three:
- `app/actions/revalidateRooms.ts`
- `app/actions/apaleo/rooms/getRoomPrice.ts`
- `app/actions/apaleo/rooms/getPrices.ts`

Everything else under `app/actions/` (incl. all `supabase/auth/*`) are **plain async TS modules imported by client components**, not Server Actions. Don't assume `'use server'` from folder name.

---

## Auth flow

### Provider

`lib/auth-provider.tsx` line 1–70 — client context exposing `{ user, session, loading, signOut() }`. Subscribes to `supabase.auth.onAuthStateChange()` for live updates. Single source of truth — no parallel hooks/stores for auth state.

### OAuth + email-confirm callback

`app/auth/callback/route.ts` (1–127):
1. `exchangeCodeForSession(code)` from `?code=` param
2. If first confirm — sync `email` to `profiles` + insert `consents` row (registration type, IP, privacy-policy-version)
3. Redirects to `/profile/reservations` by default; preserves locale

### OAuth providers

`app/actions/supabase/auth/signInWithOAuth.ts` line 17 accepts `'google' | 'apple'`. Apple is wired but **commented out in the UI** (`app/_components/Auth/SocialMediaButtons.tsx` lines 22–30). Effectively disabled — don't claim "Apple OAuth available" without enabling the button first.

### Anonymous (guest) checkout

Triggered in `app/_components/Auth/ReservationForm.tsx` via `supabase.auth.signInAnonymously()` when an unauthenticated user starts the booking flow.

### Protected gate

`app/[locale]/(protected)/layout.tsx` line 13–17 — Supabase `getUser()` → if null, `redirect('/login')`. Locale prefix preserved. **Not** in middleware.

### Admin panel — ⚠️ no auth gate

`app/admin/layout.tsx` line 1–9 wraps only `ReactQueryProvider`. **No `getUser()` check.** Routes are publicly reachable; auth is checked per-page (or not at all) in client code. **Tracked as ISSUE-03 (critical).** Don't add new admin pages without checking the `admins` table server-side.

---

## State management — `store/`

### `useBookingStore.ts` (line 71–177)

Persisted to `'charlie-booking-storage'` (version `1`). Migration on hydrate sets `isRefundable: false` for old payloads (line 156–159). Partializes:

```
booking, rooms, roomDetails, bookingId, isRefundable, isExtend,
transactionReference, paymentReference, reservationId, apaleoBookingId,
reservationIds, services, extras
```

**Breaking schema changes break in-flight bookings in production.** When adding/removing fields: bump `version`, write a `migrate()`, and account for partial state from old keys (ISSUE-11: store currently doesn't validate hydrated state with Zod).

### Other stores

- `useStore.ts` — generic UI state
- `useProfile.ts` — profile-page local state
- `useAddExtras.ts` — extras selection during booking flow

None of the others are persisted long-term.

---

## TanStack Query hooks — `app/hooks/`

| Hook | Type | Notes |
|---|---|---|
| `useUnit.ts` | query | key `['unit-floor', unitId]` |
| `useUpdateService.ts` | mutation | invalidates `['services']`, `['service', id]` |
| `useServicePhoto.ts` | mutation | invalidates `['services']` |
| `useInvoice.ts` | mutation | folio + PDF |
| `useAuth.ts` | mutations | login, signup, OAuth |
| `useProfile.ts` | query | profile data |
| `useReservations.ts` | query+mutation | list + add/cancel |
| `useRoomPhotos.ts` | query | room images from Supabase |
| `useAddReservation.ts` | mutation | link reservation to user |
| `useExtensionRooms.ts` | query | rooms for stay extension |
| `usePreCheckIn.ts` | mutation | Mindee OCR + Guestway |
| `useUpdateBookingAddress.ts` | mutation | guest address update |
| `useUpdateRoom.ts` | mutation | admin: room edit |
| `useSearchBooking.ts` | query | search by booking ID |

**No shared `queryKeys` constants file** — keys are inline strings. When invalidating across hooks, grep first to avoid mismatches.

---

## Forms & validation — `types/schemas.ts`

Zod schemas (line 1–80+):
- `loginSchema` — email regex permits short local parts
- `registerSchema` — 8+ chars, ≥1 uppercase (Latin **or Cyrillic**), ≥1 digit, ≥1 special char
- `forgotPasswordSchema`, `resetPasswordSchema`
- `reservationSchema`, `guestDetailsSchema` — full booking payload

React Hook Form is wired with `zodResolver`. Auth errors run through `app/actions/supabase/auth/parseAuthError.ts` to translate Supabase error codes → user-friendly messages.

---

## i18n

- Folder: `messages/{en,de}.json` (CharlieM uses `messages/`, Motz19 uses `language/`)
- `i18n.ts` line 1–14 — `locales: ['en', 'de']`, default `'en'`
- `navigation.ts` — exports `{ Link, redirect, usePathname, useRouter }` from `next-intl/navigation` with `localePrefix: 'as-needed'`
- `middleware.ts` line 5–9 — `localeDetection: false` (no auto-redirect on `Accept-Language`)

Always import `Link`/`useRouter` from `@/navigation`, never from `next/link` or `next/navigation` — locale would be lost.

---

## Hotel-specific data

### Room codes (12 types, prefix `CMH-`)

`content/RoomsDetails.ts` lines 3–87: `SGB`, `BUQ`, `BUK`, `BUQB`, `SPKB`, `SPK`, `STKST`, `SPKT`, `SPKGW`, `SPKST`, `STKB`, `BUKT`. Canonical set lives here + Apaleo unit groups + Supabase `rooms` table — keep all three in sync.

### Service codes (7 types, prefix `CMH-`)

Includes `CMH-BRKF` (breakfast) and `CMH-PRK` (parking) — **not present in Motz19**. Defined in `content/ServiceTranslations.ts`.

### Constants (`lib/Constants.ts`)

- `CITY_TAX_RATE = 0.075` (always added manually — Apaleo offer prices exclude it)
- `EMAIL = 'info@charlie-m.de'`
- `DEFAULT_CHECKIN_TIME`, `DEFAULT_CHECKOUT_TIME`
- `RATE_PLANS` codes + helpers: `getRatePlanByNights()`, `getNonRefundableRatePlanByNights()`, `resolveRatePlan()`
- `HOTEL_INFO` — name, address (Friedrichstraße 33), geo (52.5076, 13.3908), 125 rooms, 5★, amenities (co-working, virtual concierge "Charlie", smart locks, etc.)

### Landing sections (`app/[locale]/_home/`)

`Video → Concept → Design → Experience → Personalize → Location → Rooms → FAQ → Reviews → Instagram`. Reviews fetched in RSC via `services/getGoogleReviews.ts` (no `/api/reviews/` route — Motz19 has one).

---

## Guestway integration

`services/guestway/accesses.ts` + `services/getReservationAccessesServer.ts`. Used by:
- `app/api/check-in/route.ts` — pre-check-in submission
- (no separate `/api/reservation-accesses/` route in current tree — accesses fetched server-side via the helper)

---

## Project-specific files (not in Motz19)

- `lib/getExtraImage.ts` — extra/service image URL helper
- `services/getRoomsDetails.ts` — joins Supabase descriptions + content layer
- `services/getReservationAccessesServer.ts` — Guestway PIN access (RSC-side)
- `app/_components/header/CheckInDialog.tsx`, `MobileCheckInForm.tsx` — sticky pre-check-in dialog (CharlieM-only UX)
- `app/[locale]/_home/components/StickyCheckInForm.tsx` — landing-page sticky form
- `app/_components/ui/DevelopmentBanner.tsx` — **always-visible** red banner using translation key `developmentBanner.message`. Not env-gated. Remove or gate before going live.

---

## Recent GDPR migrations (deploy status critical)

Two migrations dated **2026-05-02** sit in `supabase/migrations/` but assume their state isn't applied yet — verify in Supabase before claiming compliance:

- `20260502000001_fix_reservations_rls.sql` — drops public RLS on `reservations`, adds `auth.uid() = user_id` policies
- `20260502000002_gdpr_auto_cleanup.sql` — `pg_cron` daily cleanup of stale `pending_bookings` (48h) + IP anonymization on `consents` (6mo)
- `important_tighten_bookings_rls.sql` — tightens write access on `bookings`/`pending_bookings` to service_role only (named without timestamp; verify ordering before applying)

After applying, any code path that reads/writes these tables without service_role MUST run as the owning user. Webhook is already correct; new endpoints must follow.

Pending GDPR work tracked in `../docs/gdpr-plan.md`. Don't modify auth, RLS, retention, or webhook code without consulting it.

## Cookie consent (compliant since 2026-05-02)

Implementation matches Motz19 exactly:

- Defaults `denied` set in root `app/layout.tsx` via `<Script id="consent-init" strategy="beforeInteractive">` **before** `gtag.js` loads — gtag effectively sees no events until `applyConsent()` flips state
- `<CookieConsentBanner />` mounted in `app/[locale]/layout.tsx`; `<CookieSettingsButton />` mounted in `app/_components/footer/Contacts.tsx`
- `lib/analytics.ts` exposes `applyConsent({ analytics, ads })` which writes to `localStorage` under `charlie_cookie_consent` with `version: CONSENT_VERSION` and a `timestamp`
- `getStoredConsent()` returns `null` on version mismatch — bumping `CONSENT_VERSION` (currently `1`) forces re-prompt across all users; do this whenever a new vendor or category is introduced
- Banner UI: equal-prominence Reject All ≡ Accept All (both filled `bg-mute`), Save Preferences as outline middle button, "Strictly necessary" row with `Always active` badge (no toggle), `<Link href='/privacy-policy'>` below description
- Translations live in `messages/{en,de}.json` under `cookies.*`

---

## Open issue debt → `ISSUES.md`

26 issues catalogued at `/Users/Vladyslav/Desktop/Hotels/CharlieM/ISSUES.md` (last updated 2026-03-23). When working on this project, scan it for context. Especially relevant:

- 🔴 **ISSUE-02** — All `/api/*` routes lack auth checks (publicly callable)
- 🔴 **ISSUE-03** — `/admin` and `/api` bypass middleware, no layout-level auth
- 🟠 **ISSUE-04** — 60+ `console.log` calls expose PII (booking data, email, phone)
- ~~🟠 **ISSUE-05**~~ — `lib/apaleo.ts` deleted 2026-05-02 (was a token-cache conflict risk; only `services/Request.ts` remains)
- 🟡 **ISSUE-11** — Zustand store hydrates without Zod validation
- 🟡 **ISSUE-13** — `next.config.ts` images `remotePatterns` uses wildcard hostname (should be exact)
- 🟡 **ISSUE-14** — ~68% of components are `'use client'` (bundle size)
- 🟡 **ISSUE-19** — middleware would call DB on every request if auth were added there

When fixing any of these, update `ISSUES.md` status (🔴/🟠/🟡 → ✅) in the same commit.

---

## CI / release

- `.gitlab-ci.yml` — stages: lint → test → secret-detection → sonarqube → release. Runs on every push to `dev` + MRs.
- `.releaserc.json` — semantic-release on `dev` branch; conventional-commits drive version bumps. Updates `CHANGELOG.md`, tags `v{x}`, publishes to (private) npm.
- Branch model: feature branch → MR to `dev` → semantic-release → MR `dev` → `main` for production.
- Never add `Co-Authored-By` lines to commits (workspace-wide rule from root CLAUDE.md).

---

## When you need exact values

| Looking for | Source |
|---|---|
| Apaleo property/account/client IDs, room codes, service codes, env keys | `../docs/differences.md` |
| Open technical debt + status | `ISSUES.md` |
| GDPR remaining work | `../docs/gdpr-plan.md` |
| Hotel info, rate plans, helpers | `lib/Constants.ts` |
| Migration history | `supabase/migrations/` |
