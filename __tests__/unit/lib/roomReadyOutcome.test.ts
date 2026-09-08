import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { doorStayedShut } from '@/lib/roomReadyOutcome'

/**
 * Which room-ready outcomes reach a human.
 *
 * Both ways of getting this wrong are costly, and the balance moved when the
 * sweep arrived. Alert on an ordinary outcome and the morning pages dozens of
 * times — every arrival, every quarter hour, describing a room that housekeeping
 * simply has not reached yet — after which nobody reads the channel. Stay quiet
 * on a real one and the door silently never opens, which is the failure this
 * feature is watched for in the first place.
 */

/** Every reason openRoomEarly can return, and whether it is worth an alert. */
const EXPECTED: Record<string, boolean> = {
  // Nothing that happens later can clear these.
  'not-configured': true,
  'no-arrival-time': true,
  'price-drift': true,

  // States the sweep will simply ask about again in fifteen minutes.
  'unit-dirty': false,
  'unit-occupied': false,
  'unit-unknown': false,
  // The room moved under us, or stopped being ready, between the check and the
  // amend. The next pass looks at whatever room the guest now has.
  'unit-changed': false,
  'no-unit-assigned': false,
  'no-offer': false,
  // We sold the departing guest that late checkout. Nothing is broken.
  'opposite-extension-conflict': false,

  // Ordinary outcomes. Nothing disagreed and nothing is broken.
  'nothing-earlier-to-gain': false,
  'not-arriving-today': false,
  'too-late-in-day': false,
  'not-found-or-other-property': false,
  'status-': false,
}

describe('classifying a room-ready outcome', () => {
  it('alerts only on what a later attempt cannot fix', () => {
    for (const [reason, shouldAlert] of Object.entries(EXPECTED)) {
      expect(doorStayedShut(reason), reason).toBe(shouldAlert)
    }
  })

  it('stays quiet on the everyday outcome', () => {
    // The paid-ECI guest already sits at 13:00, so there is nothing earlier to
    // move to. This fires for a large share of arrivals every single day; if it
    // ever became alertable the channel would be unusable.
    expect(doorStayedShut('nothing-earlier-to-gain')).toBe(false)
  })

  it('stays quiet while a room is merely not ready yet', () => {
    // The regression this list was rewritten for. These three ran at error
    // level while the webhook was the only chance a guest got; with the sweep
    // asking again all day they are the normal state of a hotel before noon:
    // measured at Motz19, every unit read Dirty right through the shift.
    for (const reason of ['unit-dirty', 'unit-occupied', 'unit-unknown']) {
      expect(doorStayedShut(reason), reason).toBe(false)
    }
  })

  it('knows every reason the service can actually produce', () => {
    // The guard that matters. An unlisted reason falls through to "quiet",
    // so adding a skip to openRoomEarly without deciding whether it deserves
    // an alert would silently hide it — exactly the failure mode this whole
    // classification exists to remove. Reading the source keeps that decision
    // forced, which is also why the readiness branches are spelled out one
    // literal at a time over there rather than returning a variable.
    const src = readFileSync(
      join(process.cwd(), 'services/apaleo/amendStayTime.ts'),
      'utf8',
    )
    const openRoomEarly = src.slice(src.indexOf('export async function openRoomEarly'))
    const found = new Set(
      [...openRoomEarly.matchAll(/reason: ['`]([a-z-]*)/g)].map((m) => m[1]),
    )

    expect(found.size).toBeGreaterThan(0)
    for (const reason of found) {
      expect(
        Object.hasOwn(EXPECTED, reason),
        `openRoomEarly can return "${reason}" but this test does not say whether it should alert`,
      ).toBe(true)
    }
  })

  it('still sees the readiness reasons after the split', () => {
    // They were one `unit-not-ready` before. If a refactor ever
    // collapses them back into a variable, the exhaustiveness check above goes
    // blind without failing — this is what notices.
    const src = readFileSync(
      join(process.cwd(), 'services/apaleo/amendStayTime.ts'),
      'utf8',
    )
    for (const reason of ['unit-dirty', 'unit-occupied', 'unit-unknown']) {
      expect(src, reason).toContain(`reason: '${reason}'`)
    }
  })
})
