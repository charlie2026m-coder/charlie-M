import { describe, expect, it } from 'vitest'
import { AREAS, canUsePanel, landingFor, normaliseAreas, roleLabel } from './adminAccess'

describe('normaliseAreas', () => {
  it('keeps known areas in canonical order and drops the rest', () => {
    expect(normaliseAreas(['team', 'hotel', 'bogus', 'breakfast'])).toEqual(['breakfast', 'hotel', 'team'])
  })
  it('turns anything that is not a list into nothing', () => {
    expect(normaliseAreas(null)).toEqual([])
    expect(normaliseAreas('hotel')).toEqual([])
    expect(normaliseAreas(undefined)).toEqual([])
  })
})

describe('where a login lands', () => {
  it('the panel, for anyone who may do more than run the kitchen screen', () => {
    expect(landingFor(['hotel'])).toBe('/admin')
    expect(landingFor(['kitchen', 'breakfast'])).toBe('/admin')
    expect(canUsePanel(['team'])).toBe(true)
  })
  it('the kitchen screen, for the kitchen-only login', () => {
    expect(landingFor(['kitchen'])).toBe('/kitchen')
    expect(canUsePanel(['kitchen'])).toBe(false)
  })
  it('nowhere, for a row with no areas', () => {
    expect(landingFor([])).toBeNull()
  })
})

describe('roleLabel', () => {
  it('names the three shapes people actually have', () => {
    expect(roleLabel([...AREAS])).toBe('Owner')
    expect(roleLabel(['kitchen'])).toBe('Kitchen')
    expect(roleLabel(['breakfast', 'hotel'])).toBe('Manager')
    expect(roleLabel([])).toBe('No access')
  })
})
