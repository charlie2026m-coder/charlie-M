import { describe, it, expect } from 'vitest'
import {
  buildBreakfastMenuInvite,
  buildBreakfastReminder,
} from '@/services/guestway/sendGuestwayMessage'

/**
 * These go out over channels that strip HTML (OTA chat threads), so they are
 * plain text and bilingual. The link is the whole point of both — a message
 * that loses it is worse than no message, because the guest now knows there is
 * something to do and has no way to do it.
 */
const URL = 'https://www.charlie-m.de/breakfast/abc123'

describe('buildBreakfastMenuInvite', () => {
  it('carries the link and both languages', () => {
    const body = buildBreakfastMenuInvite(URL, 3)
    expect(body).toContain(URL)
    expect(body).toContain('Breakfast — choose your menu')
    expect(body).toContain('Frühstück — wählen Sie Ihr Menü')
  })

  it('counts the mornings in each language', () => {
    expect(buildBreakfastMenuInvite(URL, 1)).toContain('one morning')
    expect(buildBreakfastMenuInvite(URL, 1)).toContain('einen Morgen')
    expect(buildBreakfastMenuInvite(URL, 4)).toContain('4 mornings')
  })

  it('is plain text — no markup to be stripped', () => {
    expect(buildBreakfastMenuInvite(URL, 2)).not.toMatch(/<[a-z]/i)
  })
})

describe('buildBreakfastReminder', () => {
  it('carries the link and both languages', () => {
    const body = buildBreakfastReminder(URL)
    expect(body).toContain(URL)
    expect(body).toContain('Breakfast tomorrow')
    expect(body).toContain('Frühstück morgen')
  })

  it('is shorter than the first invite — it is read at bedtime', () => {
    expect(buildBreakfastReminder(URL).length).toBeLessThan(
      buildBreakfastMenuInvite(URL, 3).length,
    )
  })
})
