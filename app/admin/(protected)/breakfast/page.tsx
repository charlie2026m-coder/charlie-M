'use client'

/**
 * Breakfast back office: the menus, the sittings, and which menu is on which
 * morning. Until this existed all three were edited by hand in SQL.
 *
 * Three separate saves rather than one big form. The kitchen changes one thing
 * at a time — a capacity, a description, next month's calendar — and a single
 * "save everything" button would make every edit a chance to overwrite someone
 * else's while they were typing.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { MdAdd, MdArrowBack, MdDelete } from 'react-icons/md'
import { Button } from '@/app/_components/ui/button'
import { MenuIcon, MENU_ICON_NAMES } from '@/app/_components/breakfast/MenuIcon'
import { addDays } from '@/lib/breakfastDates'

interface MenuRow {
  code: string
  icon: string
  name_de: string
  name_en: string
  description_de: string
  description_en: string
  items_de: string
  items_en: string
  allergens_de: string
  allergens_en: string
  sort_order: number
  is_active: boolean
}

interface SlotRow {
  id: number
  starts_at: string
  ends_at: string
  capacity: number
  sort_order: number
  is_active: boolean
}

const berlinToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date())

const field =
  'h-9 w-full rounded-lg border border-gray-300 px-2 text-sm outline-none focus:border-black'
const area =
  'w-full rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-black'

export default function BreakfastAdminPage() {
  return (
    <main className='mx-auto w-full max-w-[980px] p-4 pb-20 sm:p-6'>
      <div className='mb-6 flex flex-wrap items-center gap-3'>
        <Button asChild variant='outline' size='sm' className='h-8'>
          <Link href='/admin'>
            <MdArrowBack /> Admin
          </Link>
        </Button>
        <h1 className='text-xl font-bold text-black'>Breakfast</h1>
        <div className='ml-auto flex gap-2'>
          <Button asChild variant='outline' size='sm' className='h-8'>
            <Link href='/admin/breakfast/report'>Kitchen sheet</Link>
          </Button>
          <Button asChild variant='outline' size='sm' className='h-8'>
            <Link href='/admin/breakfast/scan'>Door</Link>
          </Button>
        </div>
      </div>

      <Menus />
      <Slots />
      <Calendar />
    </main>
  )
}

/* ------------------------------------------------------------------ menus */

function Menus() {
  const [menus, setMenus] = useState<MenuRow[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/breakfast/menus', { cache: 'no-store' })
    if (!res.ok) return setMenus([])
    const json = await res.json()
    setMenus(json.menus ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const add = async () => {
    const code = newCode.trim().toUpperCase()
    if (!code) return
    setAdding(true)
    const res = await fetch('/api/admin/breakfast/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, name_en: `Menu ${code}`, name_de: `Menü ${code}`, icon: 'utensils' }),
    })
    const json = await res.json().catch(() => ({ ok: false }))
    setAdding(false)
    setNote(json.ok ? '' : json.error === 'code_taken' ? 'That code already exists.' : 'Could not add it.')
    if (json.ok) {
      setNewCode('')
      void load()
    }
  }

  return (
    <section className='mb-10'>
      <h2 className='mb-3 text-xs font-medium uppercase tracking-[0.14em] text-gray-500'>Menus</h2>

      {menus === null ? (
        <p className='text-sm text-gray-500'>Loading…</p>
      ) : (
        <div className='flex flex-col gap-4'>
          {menus.map(menu => (
            <MenuCard key={menu.code} menu={menu} onSaved={load} />
          ))}
        </div>
      )}

      <div className='mt-4 flex flex-wrap items-center gap-2'>
        <input
          value={newCode}
          onChange={e => setNewCode(e.target.value)}
          placeholder='New code, e.g. E'
          className={`${field} w-40`}
        />
        <Button variant='outline' size='sm' className='h-9' disabled={adding} onClick={() => void add()}>
          <MdAdd /> Add menu
        </Button>
        {note && <span className='text-sm text-red-700'>{note}</span>}
      </div>
      <p className='mt-2 text-xs text-gray-500'>
        Menus are never deleted — every booking that chose one still points at it. Untick “On
        offer” to take it off the guest’s choices.
      </p>
    </section>
  )
}

function MenuCard({ menu, onSaved }: { menu: MenuRow; onSaved: () => void }) {
  const [draft, setDraft] = useState(menu)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => setDraft(menu), [menu])

  const set = (patch: Partial<MenuRow>) => {
    setDraft(d => ({ ...d, ...patch }))
    setState('idle')
  }

  const save = async () => {
    setState('saving')
    const res = await fetch('/api/admin/breakfast/menus', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    const json = await res.json().catch(() => ({ ok: false }))
    setState(json.ok ? 'saved' : 'error')
    if (json.ok) onSaved()
  }

  return (
    <div className='rounded-xl border border-gray-200 p-4'>
      <div className='mb-3 flex flex-wrap items-center gap-3'>
        <span className='inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium'>
          <MenuIcon name={draft.icon} className='h-4 w-4 shrink-0' />
          {menu.code}
        </span>
        <label className='flex items-center gap-2 text-sm'>
          Icon
          <select
            value={draft.icon}
            onChange={e => set({ icon: e.target.value })}
            className={`${field} w-44`}
          >
            <option value=''>none</option>
            {MENU_ICON_NAMES.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className='flex items-center gap-2 text-sm'>
          Order
          <input
            type='number'
            value={draft.sort_order ?? 0}
            onChange={e => set({ sort_order: Number(e.target.value) })}
            className={`${field} w-20`}
          />
        </label>
        <label className='flex items-center gap-2 text-sm'>
          <input
            type='checkbox'
            checked={draft.is_active}
            onChange={e => set({ is_active: e.target.checked })}
          />
          On offer
        </label>
      </div>

      <div className='grid gap-3 sm:grid-cols-2'>
        <Text label='Name (EN)' value={draft.name_en} onChange={v => set({ name_en: v })} />
        <Text label='Name (DE)' value={draft.name_de} onChange={v => set({ name_de: v })} />
        <Text
          label='Description (EN)'
          value={draft.description_en}
          onChange={v => set({ description_en: v })}
        />
        <Text
          label='Description (DE)'
          value={draft.description_de}
          onChange={v => set({ description_de: v })}
        />
        <Area
          label='What is in it (EN) — one per line'
          value={draft.items_en}
          onChange={v => set({ items_en: v })}
        />
        <Area
          label='What is in it (DE) — one per line'
          value={draft.items_de}
          onChange={v => set({ items_de: v })}
        />
        <Text
          label='Allergens (EN)'
          value={draft.allergens_en}
          onChange={v => set({ allergens_en: v })}
        />
        <Text
          label='Allergens (DE)'
          value={draft.allergens_de}
          onChange={v => set({ allergens_de: v })}
        />
      </div>

      <div className='mt-3 flex items-center gap-3'>
        <Button size='sm' className='h-9' disabled={state === 'saving'} onClick={() => void save()}>
          {state === 'saving' ? 'Saving…' : 'Save'}
        </Button>
        {state === 'saved' && <span className='text-sm text-green-700'>Saved</span>}
        {state === 'error' && <span className='text-sm text-red-700'>Could not save</span>}
      </div>
    </div>
  )
}

function Text({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className='block text-sm'>
      <span className='mb-1 block text-xs text-gray-500'>{label}</span>
      <input value={value ?? ''} onChange={e => onChange(e.target.value)} className={field} />
    </label>
  )
}

function Area({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className='block text-sm'>
      <span className='mb-1 block text-xs text-gray-500'>{label}</span>
      <textarea
        rows={4}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className={area}
      />
    </label>
  )
}

/* ------------------------------------------------------------------ slots */

function Slots() {
  const [slots, setSlots] = useState<SlotRow[] | null>(null)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/breakfast/slots', { cache: 'no-store' })
    if (!res.ok) return setSlots([])
    const json = await res.json()
    setSlots(json.slots ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const patch = async (row: SlotRow) => {
    setNote('')
    const res = await fetch('/api/admin/breakfast/slots', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    })
    const json = await res.json().catch(() => ({ ok: false }))
    if (!json.ok) setNote('Could not save that sitting.')
    void load()
  }

  const remove = async (id: number) => {
    setNote('')
    const res = await fetch(`/api/admin/breakfast/slots?id=${id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({ ok: false }))
    if (!json.ok) {
      setNote(
        json.error === 'in_use'
          ? 'Guests have already booked that sitting — untick “Open” instead of deleting it.'
          : 'Could not delete it.',
      )
    }
    void load()
  }

  const add = async () => {
    setNote('')
    const last = slots?.[slots.length - 1]
    const res = await fetch('/api/admin/breakfast/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        starts_at: last?.ends_at ?? '07:00',
        ends_at: last ? addHour(last.ends_at) : '08:00',
        capacity: last?.capacity ?? 12,
        sort_order: (last?.sort_order ?? 0) + 1,
      }),
    })
    const json = await res.json().catch(() => ({ ok: false }))
    if (!json.ok) setNote('Could not add a sitting.')
    void load()
  }

  const total = (slots ?? []).filter(s => s.is_active).reduce((sum, s) => sum + s.capacity, 0)

  return (
    <section className='mb-10'>
      <h2 className='mb-3 text-xs font-medium uppercase tracking-[0.14em] text-gray-500'>
        Sittings
      </h2>

      {slots === null ? (
        <p className='text-sm text-gray-500'>Loading…</p>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[540px] text-sm'>
            <thead>
              <tr className='border-b text-left text-xs uppercase tracking-wide text-gray-500'>
                <th className='py-2 pr-3'>From</th>
                <th className='py-2 pr-3'>To</th>
                <th className='py-2 pr-3'>Seats</th>
                <th className='py-2 pr-3'>Open</th>
                <th className='py-2' />
              </tr>
            </thead>
            <tbody>
              {slots.map(slot => (
                <SlotRowEditor key={slot.id} slot={slot} onSave={patch} onDelete={remove} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className='mt-3 flex flex-wrap items-center gap-3'>
        <Button variant='outline' size='sm' className='h-9' onClick={() => void add()}>
          <MdAdd /> Add sitting
        </Button>
        <span className='text-sm text-gray-500'>{total} seats a morning in total</span>
        {note && <span className='text-sm text-red-700'>{note}</span>}
      </div>
    </section>
  )
}

function SlotRowEditor({
  slot,
  onSave,
  onDelete,
}: {
  slot: SlotRow
  onSave: (row: SlotRow) => void
  onDelete: (id: number) => void
}) {
  const [draft, setDraft] = useState(slot)
  useEffect(() => setDraft(slot), [slot])
  const dirty = JSON.stringify(draft) !== JSON.stringify(slot)

  return (
    <tr className='border-b last:border-0'>
      <td className='py-2 pr-3'>
        <input
          type='time'
          value={draft.starts_at}
          onChange={e => setDraft(d => ({ ...d, starts_at: e.target.value }))}
          className={`${field} w-28`}
        />
      </td>
      <td className='py-2 pr-3'>
        <input
          type='time'
          value={draft.ends_at}
          onChange={e => setDraft(d => ({ ...d, ends_at: e.target.value }))}
          className={`${field} w-28`}
        />
      </td>
      <td className='py-2 pr-3'>
        <input
          type='number'
          min={0}
          value={draft.capacity}
          onChange={e => setDraft(d => ({ ...d, capacity: Number(e.target.value) }))}
          className={`${field} w-20`}
        />
      </td>
      <td className='py-2 pr-3'>
        <input
          type='checkbox'
          checked={draft.is_active}
          onChange={e => setDraft(d => ({ ...d, is_active: e.target.checked }))}
        />
      </td>
      <td className='py-2'>
        <div className='flex gap-2'>
          <Button size='sm' className='h-8' disabled={!dirty} onClick={() => onSave(draft)}>
            Save
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-8'
            onClick={() => onDelete(slot.id)}
            aria-label='Delete sitting'
          >
            <MdDelete />
          </Button>
        </div>
      </td>
    </tr>
  )
}

const addHour = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return `${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/* --------------------------------------------------------------- calendar */

function Calendar() {
  const [menus, setMenus] = useState<MenuRow[]>([])
  const [days, setDays] = useState<{ date: string; codes: string[] }[]>([])
  const [from, setFrom] = useState(berlinToday)
  const [to, setTo] = useState(() => addDays(berlinToday(), 30))
  const [codes, setCodes] = useState<string[]>([])
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [note, setNote] = useState('')

  const loadDays = useCallback(async () => {
    const start = berlinToday()
    const end = addDays(start, 13)
    const res = await fetch(`/api/admin/breakfast/calendar?from=${start}&to=${end}`, {
      cache: 'no-store',
    })
    if (!res.ok) return
    const json = await res.json()
    setDays(json.days ?? [])
  }, [])

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/admin/breakfast/menus', { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        const active: MenuRow[] = (json.menus ?? []).filter((m: MenuRow) => m.is_active)
        setMenus(active)
        setCodes(active.map(m => m.code))
      }
      await loadDays()
    })()
  }, [loadDays])

  const apply = async () => {
    setState('saving')
    setNote('')
    const res = await fetch('/api/admin/breakfast/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, codes }),
    })
    const json = await res.json().catch(() => ({ ok: false }))
    setState(json.ok ? 'saved' : 'error')
    if (!json.ok) {
      setNote(
        json.error === 'range_too_long'
          ? 'That is more than a year at a time.'
          : 'Could not apply it.',
      )
    }
    await loadDays()
  }

  const toggle = (code: string) =>
    setCodes(list => (list.includes(code) ? list.filter(c => c !== code) : [...list, code]))

  return (
    <section>
      <h2 className='mb-3 text-xs font-medium uppercase tracking-[0.14em] text-gray-500'>
        What is served, and when
      </h2>

      <div className='rounded-xl border border-gray-200 p-4'>
        <div className='flex flex-wrap items-end gap-3'>
          <label className='text-sm'>
            <span className='mb-1 block text-xs text-gray-500'>From</span>
            <input
              type='date'
              value={from}
              onChange={e => setFrom(e.target.value)}
              className={`${field} w-44`}
            />
          </label>
          <label className='text-sm'>
            <span className='mb-1 block text-xs text-gray-500'>To</span>
            <input
              type='date'
              value={to}
              onChange={e => setTo(e.target.value)}
              className={`${field} w-44`}
            />
          </label>
        </div>

        <div className='mt-3 flex flex-wrap gap-2'>
          {menus.map(menu => (
            <button
              key={menu.code}
              type='button'
              onClick={() => toggle(menu.code)}
              aria-pressed={codes.includes(menu.code)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                codes.includes(menu.code)
                  ? 'border-black bg-black text-white'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <MenuIcon name={menu.icon} className='h-4 w-4 shrink-0' />
              {menu.name_en || menu.code}
            </button>
          ))}
        </div>

        <div className='mt-4 flex flex-wrap items-center gap-3'>
          <Button size='sm' className='h-9' disabled={state === 'saving'} onClick={() => void apply()}>
            {state === 'saving' ? 'Applying…' : 'Apply to these dates'}
          </Button>
          {state === 'saved' && <span className='text-sm text-green-700'>Applied</span>}
          {note && <span className='text-sm text-red-700'>{note}</span>}
        </div>

        <p className='mt-3 text-xs text-gray-500'>
          This replaces whatever those days had. Selecting nothing means no breakfast is served —
          the guest page says so rather than showing an empty list.
        </p>
      </div>

      <h3 className='mb-2 mt-6 text-xs font-medium uppercase tracking-[0.14em] text-gray-500'>
        Next two weeks
      </h3>
      <ul className='divide-y rounded-xl border border-gray-200 text-sm'>
        {days.length === 0 && (
          <li className='px-4 py-3 text-gray-500'>Nothing on the calendar for the next fortnight.</li>
        )}
        {days.map(day => (
          <li key={day.date} className='flex items-center justify-between gap-3 px-4 py-2'>
            <span>{day.date}</span>
            <span className='text-gray-600'>{day.codes.join(' · ') || '—'}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
