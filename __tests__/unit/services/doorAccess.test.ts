import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Reading the door from Guestway: the room door lock's code window.
 */

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)
const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
vi.mock('@/lib/logger', () => ({ bookingLog: log }))

process.env.GUESTWAY_API_URL = 'https://open-api.example/api/open/v1/'
process.env.GUESTWAY_API_KEY = 'partner-key'
process.env.GUESTWAY_ACCESS_TOKEN = 'access-token'

const { doorFollowsArrival, roomDoorValidFrom } = await import('@/services/guestway/doorAccess')

const arrival = '2026-09-14T11:00:00+02:00' // 09:00Z
const answer = (validFrom: string | null, code = 'R-1') => ({
  ok: true,
  status: 200,
  json: async () => ({
    data: [
      {
        confirmationCode: code,
        accesses: [
          { lock: { name: 'Eingang', isRoomDoor: false }, code: { validFrom: '2026-09-14T00:00:00Z', isDisabled: false } },
          { lock: { name: '18', isRoomDoor: true }, code: validFrom ? { validFrom, isDisabled: false } : null },
        ],
      },
    ],
  }),
})
const sleep = vi.fn(async () => {})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('what it asks', () => {
  it('filters by confirmation code and uses the access token', async () => {
    fetchMock.mockResolvedValue(answer('2026-09-14T09:00:00Z'))

    await roomDoorValidFrom('R-1')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(
      'https://open-api.example/api/open/v1/reservation-accesses?filters=' +
        encodeURIComponent(JSON.stringify([{ field: 'confirmationCode', operator: 'eq', value: 'R-1' }])),
    )
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer access-token')
    expect((init.headers as Record<string, string>)['X-Api-Key']).toBe('partner-key')
  })

  it('reads the ROOM door, not the building entrance', async () => {
    fetchMock.mockResolvedValue(answer('2026-09-14T09:00:00Z'))

    expect(await roomDoorValidFrom('R-1')).toBe('2026-09-14T09:00:00Z')
  })

  it('trusts the filter only as far as the row confirms it', async () => {
    // A wrong filter field makes Guestway answer with the whole list.
    fetchMock.mockResolvedValue(answer('2026-09-14T09:00:00Z', 'SOMEONE-ELSE-1'))

    expect(await roomDoorValidFrom('R-1')).toBeNull()
  })
})

describe('whether the door followed', () => {
  it('is confirmed once the window starts at the arrival', async () => {
    fetchMock.mockResolvedValue(answer('2026-09-14T09:00:00Z'))

    expect(await doorFollowsArrival('R-1', arrival, { sleep })).toBe('confirmed')
    expect(sleep).not.toHaveBeenCalled()
  })

  it('is confirmed when the window starts EARLIER — a manual extension is a door that opens', async () => {
    fetchMock.mockResolvedValue(answer('2026-09-14T00:46:08Z'))

    expect(await doorFollowsArrival('R-1', arrival, { sleep })).toBe('confirmed')
  })

  it('waits for Guestway to catch up, then confirms', async () => {
    fetchMock
      .mockResolvedValueOnce(answer('2026-09-14T13:00:00Z'))   // still the old 15:00
      .mockResolvedValueOnce(answer('2026-09-14T13:00:00Z'))
      .mockResolvedValueOnce(answer('2026-09-14T09:00:00Z'))   // followed

    expect(await doorFollowsArrival('R-1', arrival, { sleep, attempts: 5, intervalMs: 4000 })).toBe('confirmed')
    expect(sleep).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(4000)
  })

  it('gives up as not-yet when the window never moves', async () => {
    fetchMock.mockResolvedValue(answer('2026-09-14T13:00:00Z'))

    expect(await doorFollowsArrival('R-1', arrival, { sleep, attempts: 3 })).toBe('not-yet')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('is unreadable when Guestway cannot be read, and says so', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) })

    expect(await doorFollowsArrival('R-1', arrival, { sleep, attempts: 2 })).toBe('unreadable')
    expect(log.warn).toHaveBeenCalledWith(
      'room-ready: could not read the door from Guestway',
      expect.objectContaining({ confirmationCode: 'R-1' }),
    )
  })

  it('is unreadable when the room door has no code', async () => {
    fetchMock.mockResolvedValue(answer(null))

    expect(await doorFollowsArrival('R-1', arrival, { sleep, attempts: 2 })).toBe('unreadable')
  })
})
