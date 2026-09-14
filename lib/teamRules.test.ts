import { describe, expect, it } from 'vitest'
import { refuseAreas, refuseRemoval, type TeamMember } from './teamRules'

const owner: TeamMember = { email: 'owner@x.de', areas: ['breakfast', 'hotel', 'kitchen', 'team'] }
const manager: TeamMember = { email: 'manager@x.de', areas: ['breakfast', 'hotel', 'kitchen'] }
const kitchen: TeamMember = { email: 'kitchen@x.de', areas: ['kitchen'] }
const second: TeamMember = { email: 'second@x.de', areas: ['team', 'hotel'] }

describe('removing somebody', () => {
  it('is fine for a member without Team', () => {
    expect(refuseRemoval([owner, manager, kitchen], kitchen.email, owner.email)).toBeNull()
  })
  it('never yourself', () => {
    expect(refuseRemoval([owner, second], owner.email, owner.email)).toBe('self')
  })
  it('never the last person with Team', () => {
    expect(refuseRemoval([owner, manager], owner.email, manager.email)).toBe('last_team')
  })
  it('is fine for a Team member when another one remains', () => {
    expect(refuseRemoval([owner, second], second.email, owner.email)).toBeNull()
  })
  it('refuses a stranger', () => {
    expect(refuseRemoval([owner], 'nobody@x.de', owner.email)).toBe('unknown')
  })
})

describe('changing what somebody may do', () => {
  it('needs at least one area', () => {
    expect(refuseAreas([owner, manager], manager.email, owner.email, [])).toBe('no_areas')
  })
  it('never takes Team away from yourself', () => {
    expect(refuseAreas([owner, second], owner.email, owner.email, ['hotel'])).toBe('self')
  })
  it('never takes Team away from the last person who has it', () => {
    expect(refuseAreas([owner, manager], owner.email, manager.email, ['hotel'])).toBe('last_team')
  })
  it('lets Team go when somebody else keeps it', () => {
    expect(refuseAreas([owner, second], second.email, owner.email, ['hotel'])).toBeNull()
  })
  it('lets anything else change freely', () => {
    expect(refuseAreas([owner, manager], manager.email, owner.email, ['kitchen'])).toBeNull()
    expect(refuseAreas([owner, manager], manager.email, owner.email, ['breakfast', 'hotel', 'kitchen', 'team'])).toBeNull()
  })
})
