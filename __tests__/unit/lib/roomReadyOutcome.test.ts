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
  // The last look, split in two on purpose: a room shuffled mid-afternoon is a
  // front-desk question, a room that stopped being clean is a housekeeping one.
  'unit-reassigned': false,
  'unit-no-longer-ready': false,
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
    // asking again all day they are the normal state of a hotel before noon —
    // all 13 units read Dirty at 09:39, 10:00, 10:56 and 11:19 on 2026-09-08.
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

  it('keeps the last look telling its two causes apart', () => {
    // Both were one `unit-changed`. Collapsing them again would hide which of
    // the two actually happens in practice — and they need different people.
    const src = readFileSync(join(process.cwd(), 'services/apaleo/amendStayTime.ts'), 'utf8')
    expect(src).toContain("reason: 'unit-reassigned'")
    expect(src).toContain("reason: 'unit-no-longer-ready'")
    expect(src).not.toContain("reason: 'unit-changed'")
  })

  it('re-reads the status at the last look, not just the room', () => {
    // The gap the last look exists to close swallows a check-in just as easily
    // as a room swap, and the status arrives on the same call — ignoring it
    // re-opens the Confirmed guard from the top of the function.
    const src = readFileSync(join(process.cwd(), 'services/apaleo/amendStayTime.ts'), 'utf8')
    const lastLook = src.slice(src.indexOf('LAST LOOK'))
    expect(lastLook).toContain("recheck.status !== 'Confirmed'")
  })

  it('still sees the readiness reasons after the split', () => {
    // They were one `unit-not-ready` until 2026-09-08. If a refactor ever
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

  it('takes Guestway word on cleanliness only where Guestway spoke', () => {
    // The webhook IS Guestway asserting the room is finished, and its flag runs
    // ahead of Apaleo's by an hour or more (measured 60 min on 2026-09-07,
    // 105 min on 2026-09-10). The sweep has no such assertion to pass — there is
    // no housekeeping endpoint in the Open API — so it must keep reading Apaleo,
    // which is what let it rescue MXMGMNHX-1 at 11:13 that day.
    const hook = readFileSync(
      join(process.cwd(), 'app/api/guestway/room-ready/route.ts'),
      'utf8',
    )
    const sweep = readFileSync(
      join(process.cwd(), 'app/api/cron/room-ready-sweep/route.ts'),
      'utf8',
    )
    expect(hook).toContain('trustGuestwayClean: true')
    expect(sweep).not.toContain('trustGuestwayClean')
  })

  it('never lets that trust cover an occupied or unreadable room', () => {
    // Occupancy is Apaleo's alone to know — Guestway cannot see whether the
    // previous guest is still checked in — and `unknown` means we know neither.
    // Both stay fail-closed no matter who woke us.
    const src = readFileSync(join(process.cwd(), 'services/apaleo/amendStayTime.ts'), 'utf8')
    const guard = src.slice(src.indexOf('WHOSE WORD COUNTS'), src.indexOf('const newArrival'))
    expect(guard).toMatch(/readiness === 'occupied'\s*\)?\s*return/)
    expect(guard).toMatch(/readiness === 'unknown'\s*\)?\s*return/)
    // Only the dirty branch is allowed to consult the flag.
    expect(guard).toContain("readiness === 'dirty' && !opts.trustGuestwayClean")
  })
})
