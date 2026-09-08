import { reconcileEarlyVacatedRooms } from '@/services/apaleo/blockEarlyVacatedRoom'
import { apaleoLog } from '@/lib/logger'

// Hold early-vacated rooms off sale until tomorrow morning.
//
// The self-checkout hook already does this the moment a guest leaves early, so
// on the happy path this job finds nothing to do. It exists for the paths that
// hook cannot see:
//   - an early departure entered at the desk in Apaleo, or through Guestway;
//   - a checkout where our Apaleo call landed but the block after it did not
//     (a network blip, a serverless kill between the two).
//
// There is nothing to clean up afterwards: the blocks carry an end time and
// expire by themselves tomorrow morning. Nothing here ever deletes a
// maintenance, so a hand-made OutOfOrder can never be released by accident.
export const dynamic = 'force-dynamic'
// A few sequential Apaleo calls per affected room. The count is small (only
// early departures), but Apaleo can be slow on a busy afternoon.
export const maxDuration = 60

export async function GET(req: Request) {
  // Same guard as the other crons: this endpoint writes to Apaleo inventory.
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const result = await reconcileEarlyVacatedRooms()
    // Quiet unless something actually moved: this runs four times an hour and
    // an empty pass is the normal case.
    if (result.blocked.length) {
      apaleoLog.info('early-vacated: reconciled', result)
    }
    return Response.json({ ok: true, ...result })
  } catch (err) {
    // reconcileEarlyVacatedRooms swallows its own failures, so reaching here
    // means something unforeseen — worth an alert via the logger's Sentry hook.
    apaleoLog.error('early-vacated: reconcile threw', {
      error: err instanceof Error ? err.message : String(err),
    })
    return Response.json({ ok: false }, { status: 500 })
  }
}
