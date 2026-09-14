import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: vi.fn() }))

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getAdminSession, requireAdmin } from './requireAdmin'

const mockCreateClient = vi.mocked(createSupabaseServerClient)

/** An unsigned token with the given claims — the guard reads claims, it does not verify. */
const token = (claims: Record<string, unknown>) =>
  `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`

interface Fixture {
  user?: { id: string; email?: string; factors?: { status: string }[] } | null
  row?: { role?: string; areas?: string[]; name?: string | null } | null
  aal?: string
}

function fakeSupabase(fx: Fixture) {
  const single = vi.fn().mockResolvedValue({ data: fx.row ?? null, error: null })
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: fx.user ?? null } }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: fx.aal ? { access_token: token({ aal: fx.aal }) } : null },
      }),
    },
    from: vi.fn().mockReturnValue({ select }),
  } as never
}

const OWNER = { role: 'super_admin', areas: ['breakfast', 'hotel', 'kitchen', 'team'], name: 'Owner' }
const USER = { id: 'u1', email: 'owner@charlie-m.de' }

beforeEach(() => vi.clearAllMocks())

describe('getAdminSession', () => {
  it('nobody signed in', async () => {
    mockCreateClient.mockResolvedValue(fakeSupabase({ user: null }))
    expect(await getAdminSession()).toEqual({ status: 'anonymous' })
  })

  it('a guest with an account but no admins row', async () => {
    mockCreateClient.mockResolvedValue(fakeSupabase({ user: USER, row: null }))
    expect(await getAdminSession()).toEqual({ status: 'not-staff' })
  })

  it('staff without two-factor: in, with their areas in canonical order', async () => {
    mockCreateClient.mockResolvedValue(
      fakeSupabase({ user: USER, row: { role: 'x', areas: ['team', 'nonsense', 'hotel'] } }),
    )
    const s = await getAdminSession()
    expect(s).toMatchObject({ status: 'ok', email: USER.email, areas: ['hotel', 'team'], name: null })
  })

  it('staff who set two-factor up but only typed the password so far', async () => {
    mockCreateClient.mockResolvedValue(
      fakeSupabase({ user: { ...USER, factors: [{ status: 'verified' }] }, row: OWNER, aal: 'aal1' }),
    )
    expect(await getAdminSession()).toEqual({ status: 'second-factor' })
  })

  it('an abandoned, unverified factor does not lock anybody out', async () => {
    mockCreateClient.mockResolvedValue(
      fakeSupabase({ user: { ...USER, factors: [{ status: 'unverified' }] }, row: OWNER, aal: 'aal1' }),
    )
    expect((await getAdminSession()).status).toBe('ok')
  })

  it('staff who passed the second step this session', async () => {
    mockCreateClient.mockResolvedValue(
      fakeSupabase({ user: { ...USER, factors: [{ status: 'verified' }] }, row: OWNER, aal: 'aal2' }),
    )
    expect((await getAdminSession()).status).toBe('ok')
  })
})

describe('requireAdmin', () => {
  it('401 for nobody, 403 for a guest', async () => {
    mockCreateClient.mockResolvedValue(fakeSupabase({ user: null }))
    let g = await requireAdmin()
    expect(!g.ok && g.response.status).toBe(401)

    mockCreateClient.mockResolvedValue(fakeSupabase({ user: USER, row: null }))
    g = await requireAdmin()
    expect(!g.ok && g.response.status).toBe(403)
  })

  it('401 with a code when the second factor is missing, so the screen can say so', async () => {
    mockCreateClient.mockResolvedValue(
      fakeSupabase({ user: { ...USER, factors: [{ status: 'verified' }] }, row: OWNER, aal: 'aal1' }),
    )
    const g = await requireAdmin()
    expect(g.ok).toBe(false)
    if (!g.ok) {
      expect(g.response.status).toBe(401)
      expect(await g.response.json()).toMatchObject({ code: 'mfa_required' })
    }
  })

  it('the kitchen login opens the routes that name it and nothing else', async () => {
    mockCreateClient.mockResolvedValue(fakeSupabase({ user: USER, row: { areas: ['kitchen'] } }))
    expect((await requireAdmin({ anyOf: ['breakfast', 'kitchen'] })).ok).toBe(true)
    let g = await requireAdmin({ anyOf: ['hotel'] })
    expect(!g.ok && g.response.status).toBe(403)
    g = await requireAdmin()
    expect(!g.ok && g.response.status).toBe(403)
  })

  it('a manager reaches what their areas cover, and the panel-wide routes', async () => {
    mockCreateClient.mockResolvedValue(fakeSupabase({ user: USER, row: { areas: ['hotel'] } }))
    expect((await requireAdmin()).ok).toBe(true)
    expect((await requireAdmin({ anyOf: ['hotel'] })).ok).toBe(true)
    const g = await requireAdmin({ anyOf: ['team'] })
    expect(!g.ok && g.response.status).toBe(403)
  })
})
