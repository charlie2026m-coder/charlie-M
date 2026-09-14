import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * "If it doesn't work or errors — an alert in Slack." (the owner, 2026-09-14)
 *
 * On the webhook path Guestway has just said the room is finished. Every
 * refusal but the benign ones is a door that should have opened and did not,
 * and the person who can fix it hears it with the room and in words.
 */

const openRoomEarly = vi.fn()
const loadReservationForAmend = vi.fn()
vi.mock('@/services/apaleo/amendStayTime', () => ({
  openRoomEarly: (...a: unknown[]) => openRoomEarly(...a),
  loadReservationForAmend: (...a: unknown[]) => loadReservationForAmend(...a),
}))
vi.mock('@/services/guestway/sendGuestwayMessage', () => ({
  sendGuestwayMessage: vi.fn(async () => ({ success: true })),
  buildRoomReadyMessage: (t: string) => `ready from ${t}`,
}))
vi.mock('@/services/guestway/doorAccess', () => ({ doorFollowsArrival: vi.fn(async () => 'confirmed') }))
const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
vi.mock('@/lib/logger', () => ({ bookingLog: log }))

const { runRoomReady } = await import('@/services/roomReady')

beforeEach(() => {
  vi.clearAllMocks()
  loadReservationForAmend.mockResolvedValue({ unitId: 'MOT-QGO', unitName: '18' })
})

describe('when Guestway said clean and the door did not open', () => {
  it('names the room and the reason in words, and what to do', async () => {
    openRoomEarly.mockResolvedValue({ status: 'skipped', reason: 'no-offer' })

    await runRoomReady('R-1', { alertOnFailure: true })

    expect(log.error).toHaveBeenCalledWith(
      'Room 18: cleaned, but the door was NOT moved — Apaleo offered nothing for the earlier time',
      expect.objectContaining({
        reservationId: 'R-1',
        reason: 'no-offer',
        'what to do': expect.stringContaining('Extend access'),
      }),
    )
  })

  it('says so for a previous guest still checked in — that one needs a person', async () => {
    openRoomEarly.mockResolvedValue({ status: 'skipped', reason: 'unit-occupied' })

    await runRoomReady('R-1', { alertOnFailure: true })

    expect(log.error).toHaveBeenCalledWith(
      'Room 18: cleaned, but the door was NOT moved — previous guest still checked in',
      expect.objectContaining({ 'what to do': expect.stringContaining('check the previous guest out') }),
    )
  })

  it('says so for an Apaleo error', async () => {
    openRoomEarly.mockResolvedValue({ status: 'error', reason: 'HTTP 503' })

    await runRoomReady('R-1', { alertOnFailure: true })

    expect(log.error).toHaveBeenCalledWith(
      'Room 18: door could not be opened — Apaleo error',
      expect.objectContaining({ reservationId: 'R-1', error: 'HTTP 503' }),
    )
  })

  it('stays quiet when there was nothing to do', async () => {
    for (const reason of ['nothing-earlier-to-gain', 'status-InHouse', 'status-CheckedOut', 'not-arriving-today', 'too-late-in-day']) {
      openRoomEarly.mockResolvedValue({ status: 'skipped', reason })
      await runRoomReady('R-1', { alertOnFailure: true })
    }

    expect(log.error).not.toHaveBeenCalled()
  })

  it('leaves the decision to the sweep when the sweep is calling', async () => {
    // 44 passes a day; the sweep says the hard reasons once an hour itself.
    openRoomEarly.mockResolvedValue({ status: 'skipped', reason: 'no-offer' })

    await runRoomReady('R-1', { alertOnFailure: false })

    expect(log.error).not.toHaveBeenCalled()
  })

  it('still speaks when the room name cannot be read', async () => {
    loadReservationForAmend.mockRejectedValue(new Error('503'))
    openRoomEarly.mockResolvedValue({ status: 'skipped', reason: 'no-offer' })

    await runRoomReady('R-1', { alertOnFailure: true })

    expect(log.error).toHaveBeenCalledWith(expect.stringMatching(/^Room \?: cleaned/), expect.anything())
  })
})
