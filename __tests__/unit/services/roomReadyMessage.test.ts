import { describe, expect, it } from 'vitest'
import { buildRoomReadyMessage } from '@/services/guestway/sendGuestwayMessage'

/**
 * The note a guest gets when their room turns out to be ready early.
 *
 * It is sent from the webhook the moment the arrival amend lands, so the time
 * it quotes is the time the lock actually starts working. Quoting the wrong one
 * sends someone to a door that will not open.
 */

describe('the room-ready note', () => {
  it('quotes the time the door actually opens', () => {
    const msg = buildRoomReadyMessage('2026-09-05T11:18:00+02:00')
    expect(msg).toContain('from 11:18')
    expect(msg).toContain('ab 11:18 Uhr')
  })

  it('is not pinned to 13:00 any more', () => {
    // The floor came down, so the door time is whenever housekeeping finished.
    // A hardcoded hour here would be a lie on most days.
    const msg = buildRoomReadyMessage('2026-09-05T09:41:00+02:00')
    expect(msg).toContain('09:41')
    expect(msg).not.toContain('13:00')
  })

  it('speaks both languages, because the channel decides the reader', () => {
    const msg = buildRoomReadyMessage('2026-09-05T10:03:00+02:00')
    expect(msg).toContain('Your room is ready early')
    expect(msg).toContain('Ihr Zimmer ist früher bereit')
  })

  it('carries no HTML', () => {
    // OTA chat threads strip markup and render it as a garbled duplicate wall
    // with broken umlauts — the same reason the LCO/ECI note is plain text.
    const msg = buildRoomReadyMessage('2026-09-05T10:03:00+02:00')
    expect(msg).not.toMatch(/<[a-z]/i)
  })

  it('says "now" rather than a wrong hour when the time is unparseable', () => {
    const msg = buildRoomReadyMessage('not-a-datetime')
    expect(msg).toContain('check in now')
    expect(msg).toContain('ab sofort')
    expect(msg).not.toMatch(/from undefined|from null|NaN/)
  })
})
