import { describe, expect, it } from 'vitest'
import { choiceLocked } from './breakfastDates'

describe('choiceLocked', () => {
  it('stays open the evening before, all the way to midnight', () => {
    expect(choiceLocked('2026-09-17', '2026-09-16')).toBe(false)
  })
  it('locks on the morning itself', () => {
    expect(choiceLocked('2026-09-17', '2026-09-17')).toBe(true)
  })
  it('and stays locked after', () => {
    expect(choiceLocked('2026-09-17', '2026-09-20')).toBe(true)
  })
})
