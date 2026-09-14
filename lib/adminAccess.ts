/**
 * Who may do what in the admin panel — one list, used by the database (the
 * CHECK constraint and the policies in 20260914000001_admin_areas.sql), the
 * API guards, the layouts and the screens. Add an area here and in that
 * migration, nowhere else.
 *
 * No imports on purpose: this is read in the browser (login page, team
 * screen) as well as on the server.
 */

export const AREAS = ['breakfast', 'hotel', 'kitchen', 'team'] as const
export type Area = (typeof AREAS)[number]

export const AREA_INFO: Record<Area, { label: string; hint: string }> = {
  breakfast: { label: 'Breakfast', hint: 'Numbers, kitchen sheet, bookings, the door, setup' },
  hotel: { label: 'Hotel', hint: 'Rooms, extras and QR codes on the website' },
  kitchen: { label: 'Kitchen screen', hint: 'The restaurant’s own screen and door scanner' },
  team: { label: 'Team', hint: 'Add people and decide what they can do' },
}

/** Quick picks on the team screen; the boxes can still be changed one by one. */
export const PRESETS: { label: string; areas: Area[] }[] = [
  { label: 'Owner — everything', areas: [...AREAS] },
  { label: 'Manager — everything except Team', areas: ['breakfast', 'hotel', 'kitchen'] },
  { label: 'Kitchen only', areas: ['kitchen'] },
]

/** Whatever the database or a request handed over, reduced to known areas in canonical order. */
export function normaliseAreas(raw: unknown): Area[] {
  if (!Array.isArray(raw)) return []
  return AREAS.filter(a => raw.includes(a))
}

/** The panel (everything under /admin) is for anyone who may do more than run the kitchen screen. */
export const canUsePanel = (areas: readonly Area[]): boolean => areas.some(a => a !== 'kitchen')

/** Where a login lands, or null when the account may go nowhere. */
export function landingFor(areas: readonly Area[]): '/admin' | '/kitchen' | null {
  if (canUsePanel(areas)) return '/admin'
  return areas.includes('kitchen') ? '/kitchen' : null
}

/** A word for the list, derived — nobody types roles any more. */
export function roleLabel(areas: readonly Area[]): string {
  if (areas.length === 0) return 'No access'
  if (AREAS.every(a => areas.includes(a))) return 'Owner'
  if (areas.length === 1 && areas[0] === 'kitchen') return 'Kitchen'
  return 'Manager'
}
