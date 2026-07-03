import type { ApaleoInvoiceItem } from '@/types/apaleo'

/**
 * Resolve the ONE invoice a guest should currently receive for a folio.
 *
 * Apaleo never deletes an invoice (legal requirement). Cancelling/correcting one
 * leaves an audit trail on the folio:
 *   Initial (+X)  →  Cancellation (−X, the Storno)  →  Correction (+X', the re-issue)
 * So the folio's invoice list can hold several documents; only the latest
 * non-voided one is the valid invoice for the guest.
 *
 * Returns the single valid invoice — or null when the folio is fully cancelled
 * (a cancellation with no re-issue). `cancelled` = the folio has ≥1 Cancellation.
 */
export function resolveActiveInvoice(
  invoices: readonly ApaleoInvoiceItem[],
): { active: ApaleoInvoiceItem | null; cancelled: boolean } {
  // "Fully cancelled" is decided by COUNT, independent of any sort/number format:
  // each Cancellation voids one issued document, so a folio holds no valid
  // invoice once Cancellations ≥ issued (Initial/Correction) documents. This can
  // never mis-fire on a sort edge —
  //   [Initial, Cancellation]                       → 1 ≥ 1  → cancelled (no re-issue)
  //   [Initial, Cancellation, Correction]           → 1 < 2  → active = Correction
  //   [Initial, Cancellation, Correction, Cancel]   → 2 ≥ 2  → cancelled (re-voided)
  const issued = invoices.filter((i) => i.type !== 'Cancellation')
  const cancels = invoices.length - issued.length
  if (cancels > 0 && cancels >= issued.length) {
    return { active: null, cancelled: true }
  }

  // Not fully cancelled → the valid invoice is the latest-issued non-Cancellation
  // document. Order by `created` (ISO, chronological) with a NUMERIC `number`
  // tiebreak — never a lexicographic number sort (which mis-orders at digit-width
  // boundaries like 9→10).
  const sorted = [...issued].sort((a, b) => {
    const ta = Date.parse(a.created ?? '') || 0
    const tb = Date.parse(b.created ?? '') || 0
    if (ta !== tb) return ta - tb
    const na = Number(a.number)
    const nb = Number(b.number)
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb
    return 0
  })
  return { active: sorted[sorted.length - 1] ?? null, cancelled: cancels > 0 }
}
