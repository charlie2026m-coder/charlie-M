import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Door first, then the word.
 *
 * On 2026-09-14 a guest was told "your room is ready, come in" at 09:15 and
 * stood outside a locked door at 10:25. The message had come from a Guestway
 * automation that never looks at the door; but our own path had the same
 * shape in miniature — it spoke as soon as Apaleo accepted the amend, without
 * ever seeing the door move. Now it asks Guestway for the room door's window
 * and speaks only once that window starts at the new arrival.
 */

const openRoomEarly = vi.fn()
vi.mock('@/services/apaleo/amendStayTime', () => ({
  openRoomEarly: (...a: unknown[]) => openRoomEarly(...a),
}))
const sendGuestwayMessage = vi.fn()
vi.mock('@/services/guestway/sendGuestwayMessage', () => ({
  sendGuestwayMessage: (...a: unknown[]) => sendGuestwayMessage(...a),
  buildRoomReadyMessage: (readyFrom: string) => `ready from ${readyFrom}`,
}))
const doorFollowsArrival = vi.fn()
vi.mock('@/services/guestway/doorAccess', () => ({
  doorFollowsArrival: (...a: unknown[]) => doorFollowsArrival(...a),
}))
const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
vi.mock('@/lib/logger', () => ({ bookingLog: log }))

const { runRoomReady } = await import('@/services/roomReady')

const moved = { status: 'moved', from: '2026-09-14T15:00:00+02:00', to: '2026-09-14T11:00:00+02:00' }

beforeEach(() => {
  vi.clearAllMocks()
  openRoomEarly.mockResolvedValue(moved)
  sendGuestwayMessage.mockResolvedValue({ success: true })
  doorFollowsArrival.mockResolvedValue('confirmed')
})

describe('the order of things', () => {
  it('speaks only after the door has been seen to move', async () => {
    const order: string[] = []
    doorFollowsArrival.mockImplementation(async () => { order.push('door'); return 'confirmed' })
    sendGuestwayMessage.mockImplementation(async () => { order.push('word'); return { success: true } })

    await runRoomReady('R-1')

    expect(order).toEqual(['door', 'word'])
    expect(doorFollowsArrival).toHaveBeenCalledWith('R-1', '2026-09-14T11:00:00+02:00')
    expect(sendGuestwayMessage).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 'R-1', body: 'ready from 2026-09-14T11:00:00+02:00' }),
    )
  })

  it('says nothing while the door has not followed — and raises it', async () => {
    doorFollowsArrival.mockResolvedValue('not-yet')

    const out = await runRoomReady('R-1')

    expect(sendGuestwayMessage).not.toHaveBeenCalled()
    expect(out).toEqual(moved)
    expect(log.error).toHaveBeenCalledWith(
      expect.stringContaining('guest NOT told (not-yet)'),
      expect.objectContaining({ reservationId: 'R-1', arrival: '2026-09-14T11:00:00+02:00' }),
    )
  })

  it('says nothing when the door cannot be read at all', async () => {
    // Unknown is not "open". The guest keeps the access details from
    // pre-check-in; a person follows up on the alert.
    doorFollowsArrival.mockResolvedValue('unreadable')

    await runRoomReady('R-1')

    expect(sendGuestwayMessage).not.toHaveBeenCalled()
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining('(unreadable)'), expect.anything())
  })

  it('does not go near the door when nothing was moved', async () => {
    openRoomEarly.mockResolvedValue({ status: 'skipped', reason: 'unit-dirty' })

    await runRoomReady('R-1')

    expect(doorFollowsArrival).not.toHaveBeenCalled()
    expect(sendGuestwayMessage).not.toHaveBeenCalled()
  })

  it('still reports a lost message once the door is confirmed', async () => {
    sendGuestwayMessage.mockResolvedValue({ success: false, error: 'no conversation found' })

    await runRoomReady('R-1')

    expect(log.error).toHaveBeenCalledWith(
      'room-ready: door opened but guest was not told',
      expect.objectContaining({ reservationId: 'R-1' }),
    )
  })
})
