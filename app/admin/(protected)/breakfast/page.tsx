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

import { useCallback, useEffect, useRef, useState } from 'react'
import { MdAdd, MdDelete } from 'react-icons/md'
import { Button } from '@/app/_components/ui/button'
import { MenuIcon, MENU_ICON_NAMES } from '@/app/_components/breakfast/MenuIcon'
import { PageHeader } from '@/app/_components/admin/PageHeader'
import { addDays } from '@/lib/breakfastDates'
import { nextMenuCode } from '@/lib/menuCode'

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
  photo_url: string | null
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

/** How far ahead "serve every day" reaches, and how far the cards look. */
const HORIZON = 30
/** Fired by a menu card after it changed the calendar, so the calendar
 *  section below refreshes without the two knowing each other. */
const CALENDAR_CHANGED = 'breakfast-calendar-changed'

const field =
  'h-9 w-full rounded-lg border border-gray-300 px-2 text-sm outline-none focus:border-black'
const area =
  'w-full rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-black'

export default function BreakfastAdminPage() {
  return (
    <main className='mx-auto w-full max-w-[980px] p-4 pb-20 sm:p-6'>
      <PageHeader
        title='Breakfast setup'
        description='The menus guests choose from, the sittings, and which menus are served on which days. The price is set in Apaleo.'
      />

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
  const [note, setNote] = useState('')
  /** Days in the next HORIZON on which each menu is served. */
  const [served, setServed] = useState<Map<string, number>>(new Map())

  const load = useCallback(async () => {
    const today = berlinToday()
    const [menusRes, daysRes] = await Promise.all([
      fetch('/api/admin/breakfast/menus', { cache: 'no-store' }),
      fetch(`/api/admin/breakfast/calendar?from=${today}&to=${addDays(today, HORIZON - 1)}`, {
        cache: 'no-store',
      }),
    ])
    if (!menusRes.ok) return setMenus([])
    const json = await menusRes.json()
    setMenus(json.menus ?? [])

    const counts = new Map<string, number>()
    if (daysRes.ok) {
      const days = ((await daysRes.json()).days ?? []) as { date: string; codes: string[] }[]
      for (const day of days) {
        for (const code of day.codes) counts.set(code, (counts.get(code) ?? 0) + 1)
      }
    }
    setServed(counts)
  }, [])

  useEffect(() => {
    // Deferred a tick, so the effect itself changes no state
    // (react-hooks/set-state-in-effect); the data comes from the API anyway.
    const timer = window.setTimeout(() => void load(), 0)
    // The calendar section below writes the same days these cards count.
    const refresh = () => void load()
    window.addEventListener(CALENDAR_CHANGED, refresh)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(CALENDAR_CHANGED, refresh)
    }
  }, [load])

  // The code is picked here, not typed: the next free letter. It is what the
  // kitchen sheet prints and what bookings point at, so it never changes.
  const add = async () => {
    const existing = menus ?? []
    const code = nextMenuCode(existing.map(m => m.code))
    const sortOrder = existing.reduce((max, m) => Math.max(max, m.sort_order ?? 0), 0) + 1
    setAdding(true)
    const res = await fetch('/api/admin/breakfast/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        name_en: `Menu ${code}`,
        name_de: `Menü ${code}`,
        icon: 'utensils',
        sort_order: sortOrder,
      }),
    })
    const json = await res.json().catch(() => ({ ok: false }))
    setAdding(false)
    setNote(json.ok ? '' : 'Could not add it.')
    if (json.ok) void load()
  }

  return (
    <section className='mb-10'>
      <h2 className='mb-3 text-xs font-medium uppercase tracking-[0.14em] text-gray-500'>Menus</h2>

      {menus === null ? (
        <p className='text-sm text-gray-500'>Loading…</p>
      ) : (
        <div className='flex flex-col gap-4'>
          {menus.map(menu => (
            <MenuCard key={menu.code} menu={menu} served={served.get(menu.code) ?? 0} onSaved={load} />
          ))}
        </div>
      )}

      <div className='mt-4 flex flex-wrap items-center gap-3'>
        <Button size='sm' className='h-9' disabled={adding || menus === null} onClick={() => void add()}>
          <MdAdd /> {adding ? 'Adding…' : 'Add a menu'}
        </Button>
        <span className='text-sm text-gray-500'>
          A new card appears below: name it, say what is in it, add a photo, then press “Serve
          every day” so guests can pick it.
        </span>
        {note && <span className='text-sm text-red-700'>{note}</span>}
      </div>
      <p className='mt-2 text-xs text-gray-500'>
        Menus are never deleted — every booking that chose one still points at it. Untick “On
        offer” to take it off the guest’s choices.
      </p>
    </section>
  )
}

function MenuCard({
  menu,
  served,
  onSaved,
}: {
  menu: MenuRow
  /** Days in the next HORIZON on which it is served. */
  served: number
  onSaved: () => void
}) {
  const [draft, setDraft] = useState(menu)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // A fresh row from the server replaces the draft — but only when the row
  // itself CHANGED. Comparing by identity reset every card on the screen
  // whenever any one of them reloaded the list, so an admin halfway through
  // retyping one menu lost it because they had pressed Save on another.
  const fromServer = JSON.stringify(menu)
  const [seen, setSeen] = useState(fromServer)
  if (fromServer !== seen) {
    setSeen(fromServer)
    setDraft(menu)
  }

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

      <MenuPhoto code={menu.code} url={menu.photo_url} onChanged={onSaved} />
      <MenuCalendar code={menu.code} served={served} active={menu.is_active} onChanged={onSaved} />

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

/**
 * Whether guests can actually pick this menu: a menu has to be on the
 * calendar, not merely in the list, and a freshly added one is on no day at
 * all. Two buttons cover what the kitchen nearly always means — on every day
 * for the next month, or off all of them; the calendar section below is
 * still there for anything finer.
 */
function MenuCalendar({
  code,
  served,
  active,
  onChanged,
}: {
  code: string
  served: number
  active: boolean
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const change = async (action: 'add' | 'remove') => {
    setBusy(true)
    setNote('')
    const today = berlinToday()
    const res = await fetch('/api/admin/breakfast/calendar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: today, to: addDays(today, HORIZON - 1), code, action }),
    })
    const json = await res.json().catch(() => ({ ok: false }))
    setBusy(false)
    if (!json.ok) {
      setNote('Could not change the calendar.')
      return
    }
    window.dispatchEvent(new Event(CALENDAR_CHANGED))
    onChanged()
  }

  const everyDay = served >= HORIZON
  const status =
    served === 0
      ? 'Not on the calendar yet — guests cannot pick it.'
      : everyDay
        ? `On the menu every day for the next ${HORIZON} days.`
        : `On the menu ${served} of the next ${HORIZON} days.`

  return (
    <div className='mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm'>
      <span className={served === 0 && active ? 'text-amber-800' : 'text-gray-700'}>
        {status}
        {!active && ' Not on offer, so hidden either way.'}
      </span>
      {!everyDay && (
        <Button size='sm' className='h-8' disabled={busy} onClick={() => void change('add')}>
          {busy ? 'Working…' : 'Serve every day'}
        </Button>
      )}
      {served > 0 && (
        <Button variant='outline' size='sm' className='h-8' disabled={busy} onClick={() => void change('remove')}>
          Take off all days
        </Button>
      )}
      {note && <span className='text-red-700'>{note}</span>}
    </div>
  )
}

/**
 * The picture guests see next to this menu. Uploaded straight from here; the
 * card reloads afterwards, so save any text edits first.
 */
function MenuPhoto({
  code,
  url,
  onChanged,
}: {
  code: string
  url: string | null
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    setBusy(true)
    setNote('')
    const form = new FormData()
    form.append('code', code)
    form.append('file', file)
    const res = await fetch('/api/admin/breakfast/menus/photo', { method: 'POST', body: form })
    const json = await res.json().catch(() => ({ ok: false }))
    setBusy(false)
    if (!json.ok) {
      setNote(
        json.error === 'too_big'
          ? 'Too big — 5 MB at most.'
          : json.error === 'bad_type'
            ? 'JPG, PNG or WebP only.'
            : 'Could not upload it.',
      )
      return
    }
    onChanged()
  }

  const remove = async () => {
    setBusy(true)
    setNote('')
    const res = await fetch(`/api/admin/breakfast/menus/photo?code=${encodeURIComponent(code)}`, {
      method: 'DELETE',
    })
    const json = await res.json().catch(() => ({ ok: false }))
    setBusy(false)
    if (!json.ok) {
      setNote('Could not remove it.')
      return
    }
    onChanged()
  }

  return (
    <div className='mb-3 flex flex-wrap items-center gap-3'>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt='' className='h-16 w-20 rounded-lg object-cover' />
      ) : (
        <div className='flex h-16 w-20 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400'>
          no photo
        </div>
      )}
      <div className='flex flex-wrap items-center gap-2'>
        <input
          ref={inputRef}
          type='file'
          accept='image/jpeg,image/png,image/webp'
          className='hidden'
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.target.value = ''
          }}
        />
        <Button
          variant='outline'
          size='sm'
          className='h-8'
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? 'Uploading…' : url ? 'Replace photo' : 'Add photo'}
        </Button>
        {url && (
          <Button variant='outline' size='sm' className='h-8' disabled={busy} onClick={() => void remove()}>
            Remove
          </Button>
        )}
        {note && <span className='text-sm text-red-700'>{note}</span>}
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
    // Deferred a tick, so the effect itself changes no state
    // (react-hooks/set-state-in-effect); the data comes from the API anyway.
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
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

  const [adding, setAdding] = useState(false)

  const add = async () => {
    if (adding) return
    setAdding(true)
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
    setAdding(false)
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
        <Button variant='outline' size='sm' className='h-9' disabled={adding} onClick={() => void add()}>
          <MdAdd /> {adding ? 'Adding…' : 'Add sitting'}
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
  const fromServer = JSON.stringify(slot)
  const [seen, setSeen] = useState(fromServer)
  if (fromServer !== seen) {
    setSeen(fromServer)
    setDraft(slot)
  }
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

  useEffect(() => {
    const refresh = () => void loadDays()
    window.addEventListener(CALENDAR_CHANGED, refresh)
    return () => window.removeEventListener(CALENDAR_CHANGED, refresh)
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
    // The cards above count the days each menu is served on; applying a range
    // changes that, and without this they went on saying "Not on the calendar
    // yet" until the page was reloaded.
    if (json.ok) window.dispatchEvent(new Event(CALENDAR_CHANGED))
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
