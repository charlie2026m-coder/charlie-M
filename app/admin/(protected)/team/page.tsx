'use client'

/**
 * Who can log in, and what each person may do.
 *
 * Adding somebody makes their login on the spot and shows a temporary
 * password ONCE — the owner hands it over and the person changes it in
 * Settings. No invitation e-mails to go astray, no "did you get it".
 *
 * What a person may do is a set of areas, not a rank: the four cards are the
 * truth, the presets only tick them, and each card carries the same picture
 * the menu uses for that part of the panel — so "Breakfast" here and the
 * Breakfast section over there are visibly the same thing.
 *
 * The rules that stop the hotel from locking itself out (nobody removes
 * themselves, the last person with Team stays) live in lib/teamRules.ts and
 * are applied by the API; this screen only relays the refusal in words.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  MdBed,
  MdCheck,
  MdContentCopy,
  MdDeleteOutline,
  MdGroups,
  MdKey,
  MdManageAccounts,
  MdPersonAdd,
  MdRestaurantMenu,
  MdShield,
  MdTune,
  MdTv,
  MdWorkspacePremium,
} from 'react-icons/md'
import { PageHeader } from '@/app/_components/admin/PageHeader'
import { Button } from '@/app/_components/ui/button'
import { AREAS, AREA_INFO, PRESETS, type Area } from '@/lib/adminAccess'
import { REFUSAL_TEXT } from '@/lib/teamRules'

interface Member {
  email: string
  name: string | null
  areas: Area[]
  role: string
  hasLogin: boolean
  twoFactor: boolean
  isYou: boolean
  createdAt: string
}

/** A password to hand over, or the news that there is none to hand over. */
interface Reveal {
  email: string
  password: string | null
}

/** The same picture the menu uses for that part of the panel. */
const AREA_ICON: Record<Area, React.ReactNode> = {
  breakfast: <MdRestaurantMenu />,
  hotel: <MdBed />,
  kitchen: <MdTv />,
  team: <MdGroups />,
}

const PRESET_ICON: React.ReactNode[] = [
  <MdWorkspacePremium key='owner' />,
  <MdManageAccounts key='manager' />,
  <MdRestaurantMenu key='kitchen' />,
]

const field =
  'h-11 w-full rounded-xl border border-gray-300 px-3 text-sm outline-none transition-colors focus:border-black'
const heading = 'mb-3 text-xs font-medium uppercase tracking-[0.14em] text-gray-500'

const ERRORS: Record<string, string> = {
  ...REFUSAL_TEXT,
  bad_email: 'That does not look like an e-mail address.',
  already_on_team: 'That person is already on the team.',
  nothing_to_change: 'Nothing changed.',
  failed: 'Something went wrong on the server. Try again; if it keeps failing, check the logs.',
  mfa_required: 'Your login needs its second step first. Log out and in again.',
}
const explain = (code: unknown): string =>
  (typeof code === 'string' && ERRORS[code]) || 'Could not do that.'

type Reply = { ok: boolean; error?: unknown } & Record<string, unknown>

async function call(url: string, method: string, body?: unknown): Promise<Reply> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { ...json, ok: res.ok && json.ok !== false }
}

/** Two letters for the face of a card: initials, or the first of the address. */
const initials = (member: Member): string => {
  const source = (member.name || member.email).trim()
  const parts = source.split(/[\s.@_-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[] | null>(null)
  const [error, setError] = useState('')
  const [reveal, setReveal] = useState<Reveal | null>(null)

  const load = useCallback(async () => {
    const r = await call('/api/admin/team', 'GET')
    if (!r.ok) {
      setError(explain(r.error))
      setMembers([])
      return
    }
    setMembers(r.members as Member[])
  }, [])

  useEffect(() => {
    // Deferred a tick: the list comes from the API, and this keeps the effect
    // itself free of state changes (react-hooks/set-state-in-effect).
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  return (
    <main className='mx-auto w-full max-w-[1040px] p-4 pb-20 sm:p-8'>
      <PageHeader
        title='Team'
        description='Who can log in, and what each person can do. A new person gets a temporary password to hand over; they change it in Settings.'
      />

      {reveal && <PasswordReveal reveal={reveal} onClose={() => setReveal(null)} />}

      <AddPerson
        onAdded={r => {
          setReveal(r)
          void load()
        }}
      />

      <section>
        <h2 className={heading}>People</h2>
        {members === null ? (
          <p className='text-sm text-gray-500'>Loading…</p>
        ) : error ? (
          <p className='text-sm text-red-700'>{error}</p>
        ) : (
          <ul className='flex flex-col gap-4'>
            {members.map(m => (
              <MemberCard
                // A fresh card whenever the row changes: its draft starts from what was saved.
                key={`${m.email}:${m.name ?? ''}:${m.areas.join(',')}`}
                member={m}
                onChanged={load}
                onReveal={setReveal}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function PasswordReveal({ reveal, onClose }: { reveal: Reveal; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    if (!reveal.password) return
    try {
      await navigator.clipboard.writeText(reveal.password)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className='mb-8 rounded-2xl border-2 border-black p-5'>
      {reveal.password ? (
        <>
          <div className='flex items-center gap-2 text-sm text-gray-500'>
            <MdKey className='h-4 w-4' aria-hidden /> Temporary password for
          </div>
          <div className='font-medium'>{reveal.email}</div>
          <div className='mt-3 flex flex-wrap items-center gap-2'>
            <code className='rounded-xl bg-gray-100 px-4 py-2.5 text-lg tracking-wide'>{reveal.password}</code>
            <Button variant='outline' size='sm' className='h-10' onClick={() => void copy()}>
              {copied ? <MdCheck /> : <MdContentCopy />} {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className='mt-3 text-sm text-gray-500'>
            Shown once. Hand it over in person or by phone. They sign in at /admin/login and change
            it in Settings.
          </p>
        </>
      ) : (
        <>
          <div className='font-medium'>{reveal.email} is on the team</div>
          <p className='mt-1 text-sm text-gray-500'>
            This e-mail already had an account on the site, so it keeps its password. If they do
            not know it, use “New password” on their card.
          </p>
        </>
      )}
      <Button variant='outline' size='sm' className='mt-4 h-10' onClick={onClose}>
        Done
      </Button>
    </div>
  )
}

function AreaPicker({ value, onChange }: { value: Area[]; onChange: (v: Area[]) => void }) {
  const toggle = (a: Area) => onChange(value.includes(a) ? value.filter(x => x !== a) : [...value, a])
  return (
    <div>
      <div className='mb-3 flex flex-wrap gap-2'>
        {PRESETS.map((p, i) => {
          const same = p.areas.length === value.length && p.areas.every(a => value.includes(a))
          return (
            <button
              type='button'
              key={p.label}
              onClick={() => onChange([...p.areas])}
              aria-pressed={same}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                same ? 'border-black bg-black text-white' : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className='text-sm'>{PRESET_ICON[i]}</span>
              {p.label}
            </button>
          )
        })}
      </div>
      <div className='grid gap-3 sm:grid-cols-2'>
        {AREAS.map(a => {
          const on = value.includes(a)
          return (
            <button
              type='button'
              key={a}
              onClick={() => toggle(a)}
              aria-pressed={on}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                on ? 'border-black bg-black/[0.03]' : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl transition-colors ${
                  on ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {on ? <MdCheck /> : AREA_ICON[a]}
              </span>
              <span className='min-w-0'>
                <span className='block text-sm font-semibold leading-tight'>{AREA_INFO[a].label}</span>
                <span className='mt-0.5 block text-xs leading-snug text-gray-500'>{AREA_INFO[a].hint}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AddPerson({ onAdded }: { onAdded: (r: Reveal) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [areas, setAreas] = useState<Area[]>([])
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setNote('')
    const r = await call('/api/admin/team', 'POST', { name, email, areas })
    setBusy(false)
    if (!r.ok) {
      setNote(explain(r.error))
      return
    }
    onAdded({
      email: (r.member as Member).email,
      password: typeof r.temporaryPassword === 'string' ? r.temporaryPassword : null,
    })
    setName('')
    setEmail('')
    setAreas([])
    setOpen(false)
  }

  if (!open) {
    return (
      <Button size='sm' className='mb-10 h-11 px-5' onClick={() => setOpen(true)}>
        <MdPersonAdd className='text-lg' /> Add a person
      </Button>
    )
  }

  return (
    <form onSubmit={e => void submit(e)} className='mb-10 rounded-2xl border border-gray-200 p-5'>
      <div className='mb-5 grid gap-4 sm:grid-cols-2'>
        <label className='block text-sm'>
          <span className='mb-1.5 block text-xs font-medium text-gray-500'>Name</span>
          <input value={name} onChange={e => setName(e.target.value)} className={field} placeholder='Anna' />
        </label>
        <label className='block text-sm'>
          <span className='mb-1.5 block text-xs font-medium text-gray-500'>E-mail (their login)</span>
          <input
            type='email'
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={field}
            placeholder='anna@charlie-m.de'
          />
        </label>
      </div>
      <div className='mb-2 text-xs font-medium text-gray-500'>What they can do</div>
      <AreaPicker value={areas} onChange={setAreas} />
      <div className='mt-5 flex flex-wrap items-center gap-3'>
        <Button type='submit' size='sm' className='h-11 px-5' disabled={busy || areas.length === 0 || !email}>
          {busy ? 'Adding…' : 'Add and show password'}
        </Button>
        <Button type='button' variant='outline' size='sm' className='h-11 px-5' onClick={() => setOpen(false)}>
          Cancel
        </Button>
        {note && <span className='text-sm text-red-700'>{note}</span>}
      </div>
    </form>
  )
}

function MemberCard({
  member,
  onChanged,
  onReveal,
}: {
  member: Member
  onChanged: () => Promise<void>
  onReveal: (r: Reveal) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(member.name ?? '')
  const [areas, setAreas] = useState<Area[]>(member.areas)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const label = member.name || member.email

  const run = async (work: () => Promise<Reply>, after?: (r: Reply) => void) => {
    setBusy(true)
    setNote('')
    const r = await work()
    setBusy(false)
    if (!r.ok) {
      setNote(explain(r.error))
      return
    }
    after?.(r)
    await onChanged()
  }

  const save = () =>
    run(
      () => call('/api/admin/team', 'PATCH', { email: member.email, name, areas }),
      () => setEditing(false),
    )

  const remove = () => {
    if (!window.confirm(`Remove ${label} from the team? Their login stays, but opens nothing.`)) return
    void run(() => call(`/api/admin/team?email=${encodeURIComponent(member.email)}`, 'DELETE'))
  }

  const newPassword = () => {
    const question = member.hasLogin
      ? `Give ${label} a new temporary password? The old one stops working.`
      : `Create a login for ${label} with a temporary password?`
    if (!window.confirm(question)) return
    void run(
      () => call('/api/admin/team/password', 'POST', { email: member.email }),
      r =>
        onReveal({
          email: member.email,
          password: typeof r.temporaryPassword === 'string' ? r.temporaryPassword : null,
        }),
    )
  }

  const dropTwoFactor = () => {
    if (!window.confirm(`Turn two-step login off for ${label}? Their password still works.`)) return
    void run(() => call('/api/admin/team/two-factor', 'POST', { email: member.email }))
  }

  return (
    <li className='rounded-2xl border border-gray-200 p-5'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='flex min-w-0 gap-4'>
          <span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600'>
            {initials(member)}
          </span>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='font-semibold'>{label}</span>
              {member.isYou && (
                <span className='rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-600'>
                  you
                </span>
              )}
            </div>
            {member.name && <div className='text-sm text-gray-500'>{member.email}</div>}
            <div className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500'>
              <span className='inline-flex items-center gap-1 font-medium text-gray-700'>
                <MdManageAccounts className='h-4 w-4' aria-hidden /> {member.role}
              </span>
              {member.twoFactor && (
                <span className='inline-flex items-center gap-1 text-green-700'>
                  <MdShield className='h-4 w-4' aria-hidden /> two-step login on
                </span>
              )}
              {!member.hasLogin && (
                <span className='inline-flex items-center gap-1 text-amber-700'>
                  <MdKey className='h-4 w-4' aria-hidden /> no login yet
                </span>
              )}
            </div>
            {!editing && (
              <div className='mt-3 flex flex-wrap gap-1.5'>
                {member.areas.map(a => (
                  <span
                    key={a}
                    className='inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs'
                  >
                    <span className='text-sm'>{AREA_ICON[a]}</span>
                    {AREA_INFO[a].label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {!editing && (
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' size='sm' className='h-9' disabled={busy} onClick={() => setEditing(true)}>
              <MdTune /> Rights
            </Button>
            {!member.isYou && (
              <Button variant='outline' size='sm' className='h-9' disabled={busy} onClick={newPassword}>
                <MdKey /> {member.hasLogin ? 'New password' : 'Create login'}
              </Button>
            )}
            {!member.isYou && member.twoFactor && (
              <Button variant='outline' size='sm' className='h-9' disabled={busy} onClick={dropTwoFactor}>
                <MdShield /> Turn off two-step
              </Button>
            )}
            {!member.isYou && (
              <Button
                variant='outline'
                size='sm'
                className='h-9 text-red-700'
                disabled={busy}
                onClick={remove}
              >
                <MdDeleteOutline /> Remove
              </Button>
            )}
          </div>
        )}
      </div>

      {editing && (
        <div className='mt-5 border-t border-gray-100 pt-5'>
          <label className='mb-4 block text-sm sm:max-w-xs'>
            <span className='mb-1.5 block text-xs font-medium text-gray-500'>Name</span>
            <input value={name} onChange={e => setName(e.target.value)} className={field} />
          </label>
          <div className='mb-2 text-xs font-medium text-gray-500'>What {label} can do</div>
          <AreaPicker value={areas} onChange={setAreas} />
          <div className='mt-5 flex flex-wrap gap-3'>
            <Button size='sm' className='h-11 px-5' disabled={busy || areas.length === 0} onClick={() => void save()}>
              {busy ? 'Saving…' : 'Save rights'}
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='h-11 px-5'
              onClick={() => {
                setEditing(false)
                setName(member.name ?? '')
                setAreas(member.areas)
                setNote('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {note && <p className='mt-3 text-sm text-red-700'>{note}</p>}
    </li>
  )
}
