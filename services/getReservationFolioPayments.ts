import { Fetch } from '@/services/Request'

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
 * NOTE: the summary `/folios?...&expand=payments` does NOT include
 * externalReference; only the dedicated `/folios/{id}/payments` does.
 */

export interface FolioPayment {
  pspReference: string
  amountCents: number
  currency: string
  type: string
  status: string
}

interface FoliosListResponse {
  folios?: Array<{ id: string }>
}

interface FolioPaymentsResponse {
  payments?: Array<{
    amount?: { amount?: number; currency?: string }
    type?: string
    status?: string
    externalReference?: { pspReference?: string; merchantReference?: string }
  }>
}

export async function getReservationFolioPayments(
  reservationId: string,
): Promise<FolioPayment[]> {
  const list = await Fetch<FoliosListResponse>(
    `/finance/v1/folios?reservationIds=${encodeURIComponent(reservationId)}`,
  )
  const folioIds = (list.folios ?? []).map((f) => f.id).filter(Boolean)

  const out: FolioPayment[] = []
  for (const folioId of folioIds) {
    const detail = await Fetch<FolioPaymentsResponse>(
      `/finance/v1/folios/${encodeURIComponent(folioId)}/payments`,
    )
    for (const p of detail.payments ?? []) {
      const psp = p.externalReference?.pspReference
      const amount = p.amount?.amount
      // Inflows only: a successful card capture with a psp and a positive
      // amount. Skip refunds/reversals (negative or refund-typed) so we never
      // try to "refund a refund".
      if (!psp) continue
      if (typeof amount !== 'number' || amount <= 0) continue
      if (p.status !== 'Success') continue
      if (p.type && /refund|reversal|chargeback/i.test(p.type)) continue

      out.push({
        pspReference: psp,
        amountCents: Math.round(amount * 100),
        currency: p.amount?.currency ?? 'EUR',
        type: p.type ?? '',
        status: p.status ?? '',
      })
    }
  }

  return out
}
