# Payments validation hardening — CharlieM

Status: ported from Motz19 (2026-05-28)

## Context

Same defensive hardening already shipped on the Motz19 sister codebase under
two commits (`feat(payments): server-side amount validation and defence-in-
depth hardening` + `fix(payments): block validation bypass, trust pending
payload, verify refunds`). The full audit history — 10 review rounds, 47
findings — lives at `../../Motz19/docs/payments-validation-hardening.md` and
applies one-to-one to CharlieM since both projects share the same booking
flow.

This file documents only the CharlieM-specific adaptations.

## Five defensive layers (recap)

1. **Shared extras price helper** — `lib/extrasPrice.ts`. Pure function
   `computeServicesTotalCents` is the single source of truth for both
   UI (`payment/page.tsx`) and the server validator. Drift becomes
   impossible by construction.
2. **`validateServicesPayment`** — extends `lib/payments-validation.ts`. Looks
   up `pending_services` server-side, fetches fresh Apaleo reservation +
   catalog, recomputes via Layer 1, compares cent-exact.
3. **`make-payment` flow routing** — required `flow: 'booking' | 'services'`.
   `flow=booking` → `validatePaymentAmount`; `flow=services` →
   `validateServicesPayment`. Both flows have full exhaustiveness checks via
   `_exhaustive: never`. `amount` must be a positive integer.
4. **Ownership check on `services/save-pending`** — authenticated only (401
   for anon), reservation must belong to the user (403 otherwise). Zod
   `pendingServicesPayloadSchema` rejects malformed shapes before they reach
   `pending_services`.
5. **Webhook re-validation + atomic two-phase lock** — `services/bookPendingServices.ts`.
   Re-runs `validateServicesPayment` inside the webhook, then CAS-locks
   `pending → processing`, flips to `completed` only after Apaleo + capture
   succeed. `apaleo_booked_at` sentinel column stamped before the status
   flip for reconciliation.

## Round 8 — collapse `skipped` → `unavailable`

`ValidationResult` no longer carries a `skipped` variant. The five cases
(no-reference, pending query failed, missing row, cleared, empty
reservations) all fail-closed as `unavailable` (503). The booking PaymentForm
already blocks the Adyen submit when save-pending fails, so a missing pending
row can only mean tamper / GDPR mid-flow / supabase outage — none safe.

## Round 9 — trusted prepaymentAmount in `bookings/create`

A new Step 1.5 between lock acquisition and Apaleo POST reads
`pending_bookings.booking_payload` server-side and replaces
`booking.reservations` with that trusted breakdown. Without this, a crafted
body could pass the aggregate cent validator and then submit
`prepaymentAmount: 0.01` per reservation, under-capturing from the Adyen
authorization.

## Round 10 — refund result inspection

All three `reversePayment` call sites in `bookings/create` capture the
result and branch on `success`. On refund failure the response is
`503 BookingFailedRefundFailed` with the `pspReference` echoed in the body
and an explicit "contact support and quote reference" message. The outer
catch logs `pspReferenceForCatchLog` for post-mortem correlation.

## CharlieM-specific adaptations

### 1. Route groups

CharlieM uses Next.js App Router groups `(main)/booking/[id]/...` and
`(protected)/profile/reservations/[id]/...`. Motz19 has a flat structure.
Paths referenced throughout the audit notes need this prefix in CharlieM.

### 2. Translations folder

CharlieM keeps i18n strings in `messages/{en,de}.json`. Motz19 uses
`language/`. The new key for fail-loud save-pending is
`payment.savePendingFailed` in both.

### 3. Service codes

CharlieM cleaning service code is `CMH-ADCLN` (not `CMH-CLN` — that's a
non-existent code mentioned only in an obsolete check in the previous UI
total computation, fortunately rescued by the `'clean'` name-substring
fallback). Baby bed is `CMH-BAB`. `lib/extrasPrice.ts::isCleaningService`
matches `CMH-ADCLN` exactly plus the substring fallback.

### 4. `reversePayment` location

`@/app/actions/adyen/reversePayment` (Motz19: `@/services/reversePayment`).
Return shape is identical: `{ success, status?, error?, apaleoCancelResults? }`.
Round 10 inspection works without further changes.

### 5. `pending_services` table schema

CharlieM's `pending_services` table (see `supabase/migrations/14_pending_services_update.sql`)
keeps these columns:
- `lock_key TEXT UNIQUE` — composed as `${reference}-${reservationId}`
- `transaction_reference TEXT` — the Adyen merchantReference (UUID)
- `services_payload JSONB` — the staged services array
- `service_ids TEXT[]` — for quick joins
- `apaleo_charge_id TEXT`, `error_details JSONB` — operator visibility
- `status TEXT` — CHECK supports `pending | processing | completed |
  partial_success | failed` already (no constraint change needed for the
  two-phase lock)

`validateServicesPayment` looks up by `transaction_reference` and reads
`services_payload`. `save-pending` writes with `onConflict: 'lock_key'`.
`bookPendingServices` keys all reads, locks, and updates by
`transaction_reference`.

The `apaleo_booked_at TIMESTAMPTZ` sentinel column is added by migration
`20260528000001_pending_services_processing_status.sql`.

### 6. Adyen environment

CharlieM runs Adyen on `test` (per `NEXT_PUBLIC_ADYEN_ENVIRONMENT`), not
`live`. Motz19's live-environment notes still apply once CharlieM flips to
live — the hardening is environment-independent.

### 7. `ADYEN_HMAC_KEY`

CharlieM webhook treats an unset `ADYEN_HMAC_KEY` as dev mode and skips
verification. In production it rejects the webhook. Same as Motz19.

## Out of scope (intentionally left as Motz19)

- Reconciliation cron for stuck `processing` rows — operational task, not
  a code change.
- Refactor of `getExtraPrice` in `lib/utils.ts` to use `extrasPrice` helpers
  in the booking-flow validator (still uses the old path, like Motz19).
- Persisting `useAddExtras` to localStorage — CharlieM keeps it unpersisted
  to match existing 3DS-redirect behaviour. The new `referenceFromUrl`
  recovery in services `PaymentForm` covers the redirect case as in Motz19.

## Post-port audit (round 11 — CharlieM only)

Code review + silent-failure audit on the ported patch surfaced 5 actionable
findings. All fixed in the same patchset:

**A1. Double-booking via two different `lock_key` rows.** `/api/services` was
self-locking under `lock_key = ${pspReference}-${reservationId}` while
`save-pending` writes under `lock_key = ${reference}-${reservationId}`
(reference = client UUID). The Adyen webhook looks up by
`transaction_reference = reference` — finds the save-pending row — and books
services that `/api/services` had already booked under its own row. Double
folio attach, double capture attempt. Fix: rewrite `/api/services` to
delegate to `bookPendingServices` and look up the SAME row the webhook
locks. Client now sends `reference` + `amountCents` to `/api/services`.

**A2. `bookings/create` `status='failed'` trapped retries at 202.** After
Step 1.5 refunds and marks the booking `failed`, a client retry sees the
existing-row check fall through every branch and return 202
`alreadyProcessing` forever. Fix: explicit `failed` branch in both the
short-circuit and the lock-race path → 410 `BookingPreviouslyFailed` with
the `pspReference` echoed for support correlation.

**A3. `refundAndMarkFailed` did not inspect `reversePayment.success`.** The
try/catch wrapper assumed throw semantics, but `reversePayment` returns
`{ success: false, error }` on Adyen failure. The "rolled back" warn log
fired even when the refund itself was rejected, conflicting with
`reversePayment.ts`'s own MANUAL ACTION error log. Fix: inspect the result,
escalate to `bookingLog.error('services: refund FAILED — manual
intervention required', ...)` when `!reversal.success`.

**A4. `save-pending` upsert left `apaleo_booked_at` stale.** A retry under
the same `lock_key` (3DS URL bookmark replay) would overwrite `status`
back to `pending` while leaving the sentinel populated from a previous
attempt — `bookPendingServices` could then CAS-lock and re-book. Fix:
explicit `apaleo_booked_at: null` in the upsert.

**A5. Webhook `cleared` payload skipped refund.** `createBookingFromPending`
checked `pendingError || !pendingBooking` and `status === 'completed'` but
not `booking_payload.cleared === true` (GDPR delete marker). The
subsequent spread expanded `{ cleared: true }` into the Apaleo POST,
threw, was caught and fell through to the services fallback —
`notFound` → no refund. Customer charged with no Apaleo state. Fix:
detect `cleared` after the row fetch, refund immediately, return distinct
`{ cleared: true }` outcome handled by the webhook loop.

## Manual test plan

1. Booking flow — tamper `amount` in DevTools → expect 400 `PriceChanged`.
2. Services flow without `pending_services` row → expect 503
   `ValidationUnavailable`.
3. `save-pending` for a `reservationId` not owned by current user → expect
   403.
4. `bookings/create` with crafted `prepaymentAmount: 0.01` per reservation
   but real aggregate authorization → expect trusted payload override, full
   capture amount applied.
5. Simulate Adyen refund failure (test card requiring failed 3DS, or
   intentional `pspReference` mismatch) → expect 503
   `BookingFailedRefundFailed` with the `pspReference` echoed in the body
   and the "contact support" message shown.
