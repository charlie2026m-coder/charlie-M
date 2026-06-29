import { createClient } from '@supabase/supabase-js'
import { Fetch } from '@/services/Request'
import { bookingLog } from '@/lib/logger'
import { getFolioRefundStatuses } from '@/services/apaleo/refundFolioPayment'

// Reconcile cancellation refunds against the Apaleo folio (the source of truth).
//
// Why this exists: cancellation refunds now go THROUGH Apaleo (Apaleo executes
// them via the connected Adyen account). The resulting Adyen REFUND/REFUND_FAILED
// webhook carries Apaleo's OWN reference, not our `${reservationId}::` one — so
// the Adyen webhook can no longer flip reservation_refunds to completed/failed.
// Without this job a row would sit at 'requested' forever, and a refund that
// Apaleo accepted but Adyen later FAILED downstream (e.g. insufficient merchant
// balance) would never surface — a silent guest-not-refunded. Here we read each
// refund's status off the folio (by the refund ids we stored in
// adyen_modification_ref) and advance the row: any Failure → 'failed' (manual);
// all settled → 'completed'; still Pending / not yet visible → leave for next run.
//
// Idempotent and read-mostly: only flips our own 'requested' rows based on
// Apaleo's verdict, so a re-run is harmless. Runs on a Vercel cron (vercel.json).
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// A refund found on the folio but not 'Success' after this long → flag 'failed'
// for a human (covers stuck settlement and the id-less 'NEEDS_FOLIO_CHECK'
// sentinel). Generous, to tolerate normal async settlement.
const STUCK_MS = 72 * 60 * 60 * 1000
// A 'requested' row whose stored ref matches NO folio refund after this long →
// flag 'failed' (drains legacy/direct-Adyen rows so they don't rescan forever).
const LEGACY_MS = 7 * 24 * 60 * 60 * 1000
const SENTINEL = 'NEEDS_FOLIO_CHECK'

interface FoliosListResponse {
  folios?: Array<{ id: string }>
}

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function GET(req: Request) {
  // If CRON_SECRET is set, require Vercel's cron bearer (this endpoint writes).
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()

  // Our own in-flight refunds: status 'requested' AND we stored the Apaleo refund
  // id(s). (Old direct-Adyen rows without a matching folio refund id simply never
  // match below and are left untouched — forward-only.)
  const { data: rows, error } = await supabase
    .from('reservation_refunds')
    .select('reservation_id, adyen_modification_ref, created_at')
    .eq('status', 'requested')
    .not('adyen_modification_ref', 'is', null)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    bookingLog.error('reconcile-refunds: failed to read requested rows', { error: error.message })
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }

  let completed = 0
  let failed = 0
  let pending = 0
  let skipped = 0

  for (const row of rows ?? []) {
    const ids = String(row.adyen_modification_ref ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (ids.length === 0) {
      skipped++
      continue
    }

    const mark = (fields: Record<string, unknown>) =>
      supabase
        .from('reservation_refunds')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('reservation_id', row.reservation_id)
        .eq('status', 'requested')

    try {
      const list = await Fetch<FoliosListResponse>(
        `/finance/v1/folios?reservationIds=${encodeURIComponent(row.reservation_id)}`,
      )
      const folioIds = (list.folios ?? []).map((f) => f.id).filter(Boolean)
      // No folios returned (transient/archived/scoping) — do NOT treat as "no
      // refund exists", which would wrongly drain a real row to 'failed'. Skip and
      // let a later run see the folios.
      if (folioIds.length === 0) {
        skipped++
        bookingLog.warn('reconcile-refunds: no folios returned for reservation — skipping', {
          reservationId: row.reservation_id,
        })
        continue
      }
      const statusById = await getFolioRefundStatuses(folioIds)

      // The sentinel (an id-less accepted refund) never resolves on its own — its
      // presence alone must block completion and force a timeout to manual.
      const hasSentinel = ids.includes(SENTINEL)
      const realIds = ids.filter((id) => id !== SENTINEL)
      // Apaleo RefundModel.status ∈ {Pending, Success, Failure, Canceled}.
      // Success = money returned; Failure/Canceled = it did NOT; Pending = money is
      // en route (wait — never time it out); undefined = not yet visible on folio.
      const failedIds = realIds.filter((id) => {
        const s = statusById.get(id)
        return s === 'Failure' || s === 'Canceled'
      })
      const allSuccess = realIds.length > 0 && realIds.every((id) => statusById.get(id) === 'Success')
      const anyFound = realIds.some((id) => statusById.get(id) != null)
      const anyPending = realIds.some((id) => statusById.get(id) === 'Pending')
      const ageMs = Date.now() - Date.parse(row.created_at)

      if (failedIds.length > 0) {
        // A refund Apaleo accepted but that FAILED/was Canceled downstream — the
        // guest was NOT refunded. Flag for a human; never silently complete.
        await mark({
          status: 'failed',
          note: `Apaleo refund FAILED/Canceled downstream (refundIds: ${failedIds.join(', ')}) — guest not refunded, settle manually`.slice(
            0,
            500,
          ),
        })
        failed++
        bookingLog.error('reconcile-refunds: refund failed downstream', {
          reservationId: row.reservation_id,
          failedIds,
        })
      } else if (allSuccess && !hasSentinel) {
        await mark({ status: 'completed' })
        completed++
      } else if (anyPending) {
        // At least one refund is still 'Pending' — money is en route and WILL
        // resolve to Success/Failure. Never time this out to 'failed' (a human
        // seeing 'failed' might re-refund → double-pay). Wait for the next run.
        pending++
      } else if ((anyFound || hasSentinel) && ageMs > STUCK_MS) {
        // Found on the folio but stuck not-Success with NOTHING pending after 72h
        // (an id that never reached a terminal state, or an unverifiable id-less
        // slice) → surface for a human, with an explicit do-not-double-refund note.
        await mark({
          status: 'failed',
          note: `reconcile timeout: refund(s) not Success after 72h${hasSentinel ? ' (includes an id-less slice)' : ''} — CHECK /folios refunds BEFORE any manual refund; it may have settled, do NOT double-refund`.slice(
            0,
            500,
          ),
        })
        failed++
        bookingLog.error('reconcile-refunds: refund stuck — timed out to manual', {
          reservationId: row.reservation_id,
          hasSentinel,
        })
      } else if (!anyFound && !hasSentinel && ageMs > LEGACY_MS) {
        // Stored ref matches no folio refund after 7d (legacy direct-Adyen row, or
        // a lost reference) → drain to manual so it stops rescanning forever.
        await mark({
          status: 'failed',
          note: 'reconcile: no matching folio refund after 7d — verify/resolve manually',
        })
        failed++
      } else {
        pending++ // still settling, or an id not yet visible — next run picks it up
      }
    } catch (err) {
      skipped++
      bookingLog.error('reconcile-refunds: row check failed', {
        reservationId: row.reservation_id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return Response.json({ ok: true, scanned: rows?.length ?? 0, completed, failed, pending, skipped })
}
