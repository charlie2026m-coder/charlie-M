import type { Area } from './adminAccess'

/**
 * The two ways the team screen can lock the hotel out of its own panel, and
 * the refusals that prevent them. Pure, so they are tested; the API applies
 * them before every write.
 *
 *   - Nobody removes themselves, or takes Team away from themselves: the
 *     person doing it would be the one who could no longer undo it.
 *   - The last person with Team is never removed or demoted: with nobody
 *     left who may add people, the only way back in would be SQL.
 */

export interface TeamMember {
  email: string
  areas: Area[]
}

export type TeamRefusal = 'self' | 'last_team' | 'unknown' | 'no_areas'

const teamCount = (members: readonly TeamMember[]): number =>
  members.filter(m => m.areas.includes('team')).length

/** Why removing `target` must be refused, or null when it may go ahead. */
export function refuseRemoval(
  members: readonly TeamMember[],
  target: string,
  actor: string,
): TeamRefusal | null {
  const member = members.find(m => m.email === target)
  if (!member) return 'unknown'
  if (target === actor) return 'self'
  if (member.areas.includes('team') && teamCount(members) <= 1) return 'last_team'
  return null
}

/** Why giving `target` the areas `next` must be refused, or null. */
export function refuseAreas(
  members: readonly TeamMember[],
  target: string,
  actor: string,
  next: readonly Area[],
): TeamRefusal | null {
  const member = members.find(m => m.email === target)
  if (!member) return 'unknown'
  if (next.length === 0) return 'no_areas'
  const losesTeam = member.areas.includes('team') && !next.includes('team')
  if (losesTeam) {
    if (target === actor) return 'self'
    if (teamCount(members) <= 1) return 'last_team'
  }
  return null
}

export const REFUSAL_TEXT: Record<TeamRefusal, string> = {
  self: 'You cannot do that to your own login. Ask another person with Team.',
  last_team: 'That is the last person who can manage the team. Give someone else Team first.',
  unknown: 'That person is not on the team.',
  no_areas: 'Pick at least one thing they can do, or remove them instead.',
}
