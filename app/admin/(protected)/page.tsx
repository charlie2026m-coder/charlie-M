'use client'

/**
 * The first screen after login.
 *
 * Two things, in this order: what is happening today (arrivals, departures,
 * who sleeps here, how many breakfasts), and every other screen as a card
 * with a line saying what it is for. On a phone the cards ARE the menu — the
 * sidebar is behind a button there — so nothing on this page assumes the
 * reader already knows where things live.
 *
 * The numbers come from three small requests that run side by side. Each one
 * shows "…" until it lands and "—" if it fails; a failure never blocks the
 * cards, because the cards are what people came for.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MdArrowForward } from 'react-icons/md'
import { PageHeader } from '@/app/_components/admin/PageHeader'
import { ADMIN_NAV } from '@/app/_components/admin/AdminShell'
import { addDays } from '@/lib/breakfastDates'

const berlinToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date())

const longDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`))

interface HotelToday {
  arrivals: number | null
  departures: number | null
  staying: number | null
}

interface BreakfastMorning {
  covers: number
  chosen: number
}

type Loadable<T> = { state: 'loading' } | { state: 'error' } | { state: 'ready'; data: T }

const show = (value: Loadable<number | null>): string => {
  if (value.state === 'loading') return '…'
  if (value.state === 'error' || value.data === null) return '—'
  return String(value.data)
}

const pick = <T, K extends keyof T>(value: Loadable<T>, key: K): Loadable<T[K] & (number | null)> => {
  if (value.state !== 'ready') return value
  return { state: 'ready', data: value.data[key] as T[K] & (number | null) }
}

export default function AdminHomePage() {
  const [today] = useState(berlinToday)
  const tomorrow = addDays(today, 1)

  const [hotel, setHotel] = useState<Loadable<HotelToday>>({ state: 'loading' })
  const [bfToday, setBfToday] = useState<Loadable<BreakfastMorning>>({ state: 'loading' })
  const [bfTomorrow, setBfTomorrow] = useState<Loadable<BreakfastMorning>>({ state: 'loading' })

  useEffect(() => {
    let cancelled = false
    const get = async <T,>(url: string, set: (v: Loadable<T>) => void) => {
      try {
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        const json = (await res.json()) as T
        if (!cancelled) set({ state: 'ready', data: json })
      } catch {
        if (!cancelled) set({ state: 'error' })
      }
    }
    void get<HotelToday>('/api/admin/today', setHotel)
    void get<BreakfastMorning>(`/api/admin/breakfast/report?morning=${today}`, setBfToday)
    void get<BreakfastMorning>(`/api/admin/breakfast/report?morning=${tomorrow}`, setBfTomorrow)
    return () => {
      cancelled = true
    }
  }, [today, tomorrow])

  const breakfastNote = (value: Loadable<BreakfastMorning>): string | undefined => {
    if (value.state !== 'ready') return undefined
    const left = value.data.covers - value.data.chosen
    if (value.data.covers === 0) return 'nobody has breakfast'
    return left > 0 ? `${left} still to choose a menu` : 'everyone has chosen'
  }

  return (
    <main className='mx-auto w-full max-w-[1100px] p-4 pb-16 sm:p-6'>
      <PageHeader title='Today' description={longDate(today)} />

      <section className='mb-3'>
        <div className='grid grid-cols-3 gap-3'>
          <Stat label='Arriving' value={show(pick(hotel, 'arrivals'))} />
          <Stat label='Leaving' value={show(pick(hotel, 'departures'))} />
          <Stat label='Staying tonight' value={show(pick(hotel, 'staying'))} />
        </div>
      </section>

      <section className='mb-10'>
        <div className='grid grid-cols-2 gap-3'>
          <Stat
            label='Breakfast this morning'
            value={show(pick(bfToday, 'covers'))}
            unit='guests'
            note={breakfastNote(bfToday)}
            href={`/admin/breakfast/report?morning=${today}`}
          />
          <Stat
            label='Breakfast tomorrow'
            value={show(pick(bfTomorrow, 'covers'))}
            unit='guests'
            note={breakfastNote(bfTomorrow)}
            href={`/admin/breakfast/report?morning=${tomorrow}`}
          />
        </div>
      </section>

      {ADMIN_NAV.filter(group => group.title).map(group => (
        <section key={group.title} className='mb-8'>
          <h2 className='mb-3 text-xs font-medium uppercase tracking-[0.14em] text-gray-500'>
            {group.title}
          </h2>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {group.items.map(item => {
              const body = (
                <>
                  <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl'>
                    {item.icon}
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='block font-semibold leading-tight'>{item.label}</span>
                    <span className='block text-sm leading-snug text-gray-500'>{item.hint}</span>
                  </span>
                  <MdArrowForward className='shrink-0 text-gray-300' />
                </>
              )
              const className =
                'flex items-center gap-4 rounded-2xl border border-gray-200 p-4 transition-colors hover:border-black'
              return item.external ? (
                <a key={item.href} href={item.href} target='_blank' rel='noreferrer' className={className}>
                  {body}
                </a>
              ) : (
                <Link key={item.href} href={item.href} className={className}>
                  {body}
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </main>
  )
}

function Stat({
  label,
  value,
  unit,
  note,
  href,
}: {
  label: string
  value: string
  unit?: string
  note?: string
  href?: string
}) {
  const body = (
    <>
      <div className='text-sm text-gray-500'>{label}</div>
      <div className='mt-1 text-4xl font-bold leading-none text-black'>
        {value}
        {unit && value !== '…' && value !== '—' && (
          <span className='ml-1.5 text-base font-normal text-gray-500'>{unit}</span>
        )}
      </div>
      {note && <div className='mt-2 text-sm text-gray-500'>{note}</div>}
    </>
  )
  const className = 'rounded-2xl border border-gray-200 p-4'
  return href ? (
    <Link href={href} className={`${className} block transition-colors hover:border-black`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}
