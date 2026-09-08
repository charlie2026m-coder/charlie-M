import { berlinToday, nightToMorning, remindUnchosenBreakfast } from '@/services/breakfast'
import { logger } from '@/lib/logger'

/**
 * Every evening: nudge tomorrow's breakfast guests who have not chosen.
 *
 * Runs on tomorrow's MORNING, which is the night the guest is already in the
 * house — the shift Apaleo dates the service by. See lib/breakfastDates.ts.
 *
 * Guarded by CRON_SECRET like the other jobs, and conditional in the same way
 * so it still runs where the secret is not set. That is tolerable here only
 * because the job is idempotent: every message is recorded before it can be
 * sent again, so the worst a stranger can do by calling this is make it do its
 * own work slightly early. Set CRON_SECRET anyway.
 */
export const dynamic = 'force-dynamic'
// It sweeps every reservation staying tonight out of Apaleo, page by page, and
// then sends to each guest who has not chosen. That is far past the default a
// route handler gets, and a job that dies halfway sends nothing to the guests
// it had not reached yet — they simply do not hear from us that evening.
export const maxDuration = 300

const cronLog = logger.withTag('cron')

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Tomorrow morning: tonight's guests eat it.
  const morning = nightToMorning(berlinToday())

  try {
    const run = await remindUnchosenBreakfast(morning)
    return Response.json({ ok: true, ...run })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    cronLog.error('breakfast-reminder failed', { morning, error: message })
    return Response.json({ ok: false, morning, error: message }, { status: 500 })
  }
}
