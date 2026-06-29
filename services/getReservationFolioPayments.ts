import { Fetch } from '@/services/Request'
import { bookingLog } from '@/lib/logger'

/**
 * The card payments captured on a reservation's folio(s), each with the Adyen
 * pspReference that backs it.
 *
 * Why this exists: a reservation can be paid by MORE THAN ONE Adyen payment —
 * the room at booking time (one psp, shared across the booking's reservations)
 * and any services the guest adds later (a separate psp per services payment).
 * Apaleo is the source of truth: every payment sits on the folio with its own
 * `externalReference.pspReference` and the amount that landed on THIS
 * reservation's folio (so a shared room psp already shows only this room's
 * share). Refunding has to walk these per-payment, not lump everything onto the
 * room psp — Adyen rejects a refund larger than what a single psp captured.
 *
 * Money-safety rules:
 *   - Refund/reversal-typed or negative entries are emitted with a NEGATIVE
 *     amount so the per-psp NET shrinks — an already-refunded payment can't be
 *     refunded again just because the original capture row is still listed.
 *   - `Pending` entries are counted in `unsettled` (not summed): money in
 *     flight makes any auto-refund amount untrustworthy — the caller must
 *     route to manual instead of silently dropping them.
 *   - A row literally double-listed within one folio is skipped with a warning
 *     — a re-delivered capture must not double the refund. Dedup is keyed on
 *     the payment `id` when present (so two genuinely distinct equal movements
 *     on one psp — e.g. two equal partial captures/refunds — are both kept),
 *     and falls back to a conservative psp+amount+type key only for an
 *     anomalous id-less row.
 *
 * NOTE: the summary `/folios?...&expand=payments` does NOT include
 * externalReference; only the dedicated `/folios/{id}/payments` does.
 */

export interface FolioPayment {
  pspReference: string
  /** Cents; NEGATIVE for refunds/reversals already on the folio. */
  amountCents: number
  currency: string
  type: string
  status: string
  /** The Apaleo folio this payment sits on (needed to post a refund back). */
  folioId: string
  /** Apaleo's own payment row id (null only for anomalous id-less rows). */
  paymentId: string | null
}

export interface FolioPaymentsResult {
  payments: FolioPayment[]
  /** Count of Pending entries with a psp — settle state unknown, go manual. */
  unsettled: number
}

interface FoliosListResponse {
  folios?: Array<{ id: string }>
}

interface FolioPaymentsResponse {
  payments?: Array<{
    id?: string
    amount?: { amount?: number; currency?: string }
    type?: string
    status?: string
    externalReference?: { pspReference?: string; merchantReference?: string }
  }>
}

const OUTFLOW_TYPE = /refund|reversal|chargeback|payout/i

export async function getReservationFolioPayments(
  reservationId: string,
): Promise<FolioPaymentsResult> {
  const list = await Fetch<FoliosListResponse>(
    `/finance/v1/folios?reservationIds=${encodeURIComponent(reservationId)}`,
  )
  const folioIds = (list.folios ?? []).map((f) => f.id).filter(Boolean)

  const payments: FolioPayment[] = []
  let unsettled = 0

  for (const folioId of folioIds) {
    const detail = await Fetch<FolioPaymentsResponse>(
      `/finance/v1/folios/${encodeURIComponent(folioId)}/payments`,
    )
    // Dedupe primarily on Apaleo's own payment row id, to drop a literally
    // double-listed row (at-least-once delivery) WITHOUT collapsing two
    // genuinely distinct equal movements on the same psp — e.g. two equal
    // partial captures/refunds — which a psp|amount|type key would wrongly
    // merge and mis-compute the refund. For a row that arrives WITHOUT an id
    // (anomalous, but then there's nothing to tell a duplicate from a distinct
    // movement) fall back to the conservative psp|amount|type key, so an
    // id-less double-listing can't silently double the refund.
    const seenIds = new Set<string>()
    const seenComposite = new Set<string>()

    for (const p of detail.payments ?? []) {
      const psp = p.externalReference?.pspReference
      const amount = p.amount?.amount
      if (!psp) continue
      if (typeof amount !== 'number' || amount === 0) continue

      if (p.status !== 'Success') {
        if (p.status === 'Pending') unsettled++
        continue
      }

      if (p.id) {
        if (seenIds.has(p.id)) {
          bookingLog.warn('folio payments: duplicate payment id skipped', {
            reservationId,
            folioId,
            paymentId: p.id,
          })
          continue
        }
        seenIds.add(p.id)
      } else {
        const compositeKey = `${psp}|${amount}|${p.type ?? ''}`
        if (seenComposite.has(compositeKey)) {
          bookingLog.warn('folio payments: duplicate id-less row skipped (composite key)', {
            reservationId,
            folioId,
            psp,
          })
          continue
        }
        seenComposite.add(compositeKey)
      }

      const outflow = OUTFLOW_TYPE.test(p.type ?? '') || amount < 0
      const cents = Math.round(Math.abs(amount) * 100)

      payments.push({
        pspReference: psp,
        amountCents: outflow ? -cents : cents,
        currency: p.amount?.currency ?? 'EUR',
        type: p.type ?? '',
        status: p.status ?? '',
        folioId,
        paymentId: p.id ?? null,
      })
    }
  }

  return { payments, unsettled }
}
