import { describe, expect, it } from 'vitest'
import { nextMenuCode } from './menuCode'

describe('nextMenuCode', () => {
  it('starts at A', () => {
    expect(nextMenuCode([])).toBe('A')
  })
  it('fills the first gap rather than appending', () => {
    expect(nextMenuCode(['A', 'B', 'D'])).toBe('C')
  })
  it('ignores case and whitespace in what exists', () => {
    expect(nextMenuCode([' a ', 'b'])).toBe('C')
  })
  it('goes to two letters after Z', () => {
    const all = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    expect(nextMenuCode(all)).toBe('AA')
    expect(nextMenuCode([...all, 'AA'])).toBe('AB')
  })
})
