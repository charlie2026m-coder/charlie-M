'use client'

/**
 * One booking's breakfast, for the desk.
 *
 * Look a reservation up, see what breakfast it carries and what the guest has
 * chosen, hand them their link or QR — and put breakfast on the booking when
 * they buy it at reception. The last one is also how a TEST booking gets
 * breakfast without going through a web sale: two folio services per night at
 * the catalogue price, settled in Apaleo.
 */

import { useState } from 'react'
import Link from 'next/link'
import { MdArrowBack, MdContentCopy } from 'react-icons/md'
import { Button } from '@/app/_components/ui/button'
import { MenuIcon } from '@/app/_components/breakfast/MenuIcon'

interface Morning {
  morning: string
  persons: number
  menus: { code: string; icon: string; name: string }[]
  chosenMenus: Record<string, number>
  chosenSlot: number | null
  slots: { id: number; startsAt: string; endsAt: string }[]
  attendedAt: string | null
}

interface Lookup {
  ok: true
  reservation: {
    id: string
    status: string
    arrival: string
    departure: string
    adults: number
    guest: string
    room: string
  }
  token: string
  url: string
  urlDe: string
  qr: string
  mornings: Morning[]
  needsChoice: boolean
}

const field =
  'h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-black'

const longDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${iso}T00:00:00Z`))

export default function BreakfastReservationPage() {
  const [id, setId] = useState('')
  const [data, setData] = useState<Lookup | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'notfound' | 'error'>('idle')
  const [persons, setPersons] = useState(1)
  const [adding, setAdding] = useState(false)
  const [note, setNote] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const lookup = async (reservationId: string) => {
    const value = reservationId.trim()
    if (!value) return
    setState('loading')
    setNote(null)
    try {
      const res = await fetch(`/api/admin/breakfast/reservation?reservationId=${encodeURIComponent(value)}`, {
        cache: 'no-store',
      })
      if (res.status === 404) return setState('notfound')
      if (!res.ok) return setState('error')
      const json = (await res.json()) as Lookup
      setData(json)
      setPersons(Math.max(1, Math.min(6, json.reservation.adults || 1)))
      setState('idle')
    } catch {
      setState('error')
    }
  }

  const add = async () => {
    if (!data) return
    setAdding(true)
    setNote(null)
    try {
      const res = await fetch('/api/admin/breakfast/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: data.reservation.id, persons }),
      })
      const json = await res.json().catch(() => ({ ok: false, reason: 'error' }))
      if (json.ok) {
        setNote({
          tone: 'ok',
          text: `Breakfast added for ${json.persons} on ${json.nights.length} night${json.nights.length === 1 ? '' : 's'}. The charges are on the folio — settle them in Apaleo.`,
        })
        await lookup(data.reservation.id)
      } else {
        const why: Record<string, string> = {
          'not-active': 'This booking is not Confirmed or InHouse.',
          'no-nights': 'No nights left on this stay.',
          catalog: 'Breakfast is not in the Apaleo services catalogue for these dates.',
          'booking-failed': 'Apaleo refused the service booking.',
          'bad-persons': 'Choose between 1 and 6 guests.',
        }
        setNote({ tone: 'err', text: `${why[json.reason] ?? 'Could not add it.'}${json.detail ? ` (${json.detail})` : ''}` })
      }
    } catch {
      setNote({ tone: 'err', text: 'Could not add it.' })
    } finally {
      setAdding(false)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // The link is on screen either way.
    }
  }

  return (
    <main className='mx-auto w-full max-w-[860px] p-4 pb-16 sm:p-6'>
      <div className='mb-4 flex flex-wrap items-center gap-3'>
        <Button asChild variant='outline' size='sm' className='h-8'>
          <Link href='/admin/breakfast'>
            <MdArrowBack /> Breakfast
          </Link>
        </Button>
        <h1 className='text-xl font-bold text-black'>Breakfast on a booking</h1>
      </div>

      <form
        onSubmit={e => {
          e.preventDefault()
          void lookup(id)
        }}
        className='flex gap-2'
      >
        <input
          value={id}
          onChange={e => setId(e.target.value)}
          placeholder='Reservation ID, e.g. ABCDEFGH-1'
          autoComplete='off'
          className={field}
        />
        <Button type='submit' disabled={state === 'loading' || !id.trim()} className='h-10 px-5'>
          {state === 'loading' ? 'Looking…' : 'Look up'}
        </Button>
      </form>

      {state === 'notfound' && (
        <p className='mt-3 text-sm text-red-700'>No such reservation at this property.</p>
      )}
      {state === 'error' && <p className='mt-3 text-sm text-red-700'>Could not load it. Try again.</p>}

      {data && state !== 'loading' && (
        <>
          <section className='mt-6 rounded-xl border border-gray-200 p-4'>
            <div className='flex flex-wrap items-baseline justify-between gap-2'>
              <div>
                <div className='text-lg font-medium'>{data.reservation.guest || 'Guest'}</div>
                <div className='text-sm text-gray-600'>
                  {longDate(data.reservation.arrival)} → {longDate(data.reservation.departure)}
                  {data.reservation.room ? ` · room ${data.reservation.room}` : ''} ·{' '}
                  {data.reservation.adults} {data.reservation.adults === 1 ? 'adult' : 'adults'} ·{' '}
                  {data.reservation.status}
                </div>
              </div>
              <code className='text-xs text-gray-500'>{data.reservation.id}</code>
            </div>
          </section>

          <section className='mt-4 rounded-xl border border-gray-200 p-4'>
            <h2 className='mb-2 text-xs font-medium uppercase tracking-[0.14em] text-gray-500'>
              Breakfast still to come on this booking
            </h2>
            {data.mornings.length === 0 ? (
              <p className='text-sm text-gray-600'>
                None — no breakfast service on the remaining nights. (Mornings already past are
                not listed here.)
              </p>
            ) : (
              <ul className='divide-y'>
                {data.mornings.map(m => {
                  const chosen = Object.entries(m.chosenMenus).filter(([, n]) => n > 0)
                  const slot = m.slots.find(s => s.id === m.chosenSlot)
                  return (
                    <li key={m.morning} className='flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm'>
                      <span className='w-28 shrink-0 font-medium'>{longDate(m.morning)}</span>
                      <span className='w-20 shrink-0'>{m.persons} {m.persons === 1 ? 'person' : 'people'}</span>
                      <span className='flex flex-wrap items-center gap-2'>
                        {chosen.length === 0 ? (
                          <span className='text-amber-700'>no menu chosen</span>
                        ) : (
                          chosen.map(([code, n]) => {
                            const menu = m.menus.find(x => x.code === code)
                            return (
                              <span key={code} className='inline-flex items-center gap-1'>
                                <MenuIcon name={menu?.icon ?? ''} className='h-4 w-4 shrink-0' />
                                {n}× {menu?.name ?? code}
                              </span>
                            )
                          })
                        )}
                      </span>
                      <span className='text-gray-600'>
                        {slot ? `${slot.startsAt}–${slot.endsAt}` : 'no time chosen'}
                        {m.attendedAt ? ' · came' : ''}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className='mt-4 grid gap-4 sm:grid-cols-[1fr_auto]'>
            <div className='rounded-xl border border-gray-200 p-4'>
              <h2 className='mb-2 text-xs font-medium uppercase tracking-[0.14em] text-gray-500'>
                The guest&apos;s link
              </h2>
              <p className='mb-2 text-sm text-gray-600'>
                Opens the page where they choose menu and time. The same QR is the code they show at
                the door.
              </p>
              <div className='flex flex-wrap items-center gap-2'>
                <code className='break-all rounded bg-gray-100 px-2 py-1 text-xs'>{data.url}</code>
                <Button variant='outline' size='sm' className='h-8' onClick={() => void copy(data.url)}>
                  <MdContentCopy /> {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button asChild variant='outline' size='sm' className='h-8'>
                  <a href={data.url} target='_blank' rel='noreferrer'>
                    Open EN
                  </a>
                </Button>
                <Button asChild variant='outline' size='sm' className='h-8'>
                  <a href={data.urlDe} target='_blank' rel='noreferrer'>
                    Open DE
                  </a>
                </Button>
              </div>
            </div>
            <div className='flex items-center justify-center rounded-xl border border-gray-200 p-3'>
              {/* eslint-disable-next-line @next/next/no-img-element -- our own SVG */}
              <img src={data.qr} alt='Breakfast QR' className='h-36 w-36' />
            </div>
          </section>

          {(data.reservation.status === 'Confirmed' || data.reservation.status === 'InHouse') && (
            <section className='mt-4 rounded-xl border border-gray-200 p-4'>
              <h2 className='mb-1 text-xs font-medium uppercase tracking-[0.14em] text-gray-500'>
                Add breakfast
              </h2>
              <p className='mb-3 text-sm text-gray-600'>
                Books breakfast for every remaining night of the stay at the catalogue price. The
                charges go on the folio and are settled at the desk in Apaleo. This <b>adds</b> — if
                breakfast is already on those nights, it will be there twice.
              </p>
              <div className='flex flex-wrap items-center gap-3'>
                <label className='flex items-center gap-2 text-sm'>
                  For
                  <select
                    value={persons}
                    onChange={e => setPersons(Number(e.target.value))}
                    className='h-10 rounded-lg border border-gray-300 px-2 text-sm'
                  >
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'guest' : 'guests'}
                      </option>
                    ))}
                  </select>
                </label>
                <Button className='h-10 px-5' disabled={adding} onClick={() => void add()}>
                  {adding ? 'Adding…' : 'Add breakfast to this booking'}
                </Button>
              </div>
              {note && (
                <p className={`mt-3 text-sm ${note.tone === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
                  {note.text}
                </p>
              )}
            </section>
          )}
        </>
      )}
    </main>
  )
}
