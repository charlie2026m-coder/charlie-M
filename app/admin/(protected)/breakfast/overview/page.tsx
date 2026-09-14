'use client'

/**
 * The owner's view: how many breakfasts, on which mornings, for how much.
 *
 * Covers come from Apaleo (everyone who paid, chosen or not); the money is
 * covers times the one price there is. Chosen is shown beside it because the
 * gap between the two is the number of guests who still need reminding.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { MdArrowBack, MdRefresh } from 'react-icons/md'
import { Button } from '@/app/_components/ui/button'
import { addDays } from '@/lib/breakfastDates'

interface Day {
  morning: string
  covers: number
  reservations: number
  chosen: number
  revenue: number | null
}

interface Overview {
  ok: true
  from: string
  to: string
  pricePerPerson: number | null
  days: Day[]
  totals: { covers: number; chosen: number; revenue: number | null }
}

const berlinToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date())

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${iso}T00:00:00Z`))

const eur = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

const field = 'h-8 rounded-lg border border-gray-300 px-2 text-sm'

export default function BreakfastOverviewPage() {
  const [from, setFrom] = useState(berlinToday)
  const [to, setTo] = useState(() => addDays(berlinToday(), 13))
  const [data, setData] = useState<Overview | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  const load = useCallback(async (f: string, t: string) => {
    setState('loading')
    try {
      const res = await fetch(`/api/admin/breakfast/overview?from=${f}&to=${t}`, { cache: 'no-store' })
      if (!res.ok) return setState('error')
      setData(await res.json())
      setState('ready')
    } catch {
      setState('error')
    }
  }, [])

  useEffect(() => {
    void load(from, to)
  }, [load, from, to])

  const preset = (days: number) => {
    const start = berlinToday()
    setFrom(start)
    setTo(addDays(start, days - 1))
  }

  return (
    <main className='mx-auto w-full max-w-[900px] p-4 pb-16 sm:p-6'>
      <div className='mb-4 flex flex-wrap items-center gap-3'>
        <Button asChild variant='outline' size='sm' className='h-8'>
          <Link href='/admin/breakfast'>
            <MdArrowBack /> Breakfast
          </Link>
        </Button>
        <h1 className='text-xl font-bold text-black'>Breakfast — overview</h1>
        <Button variant='outline' size='sm' className='ml-auto h-8' onClick={() => void load(from, to)}>
          <MdRefresh /> Refresh
        </Button>
      </div>

      <div className='mb-6 flex flex-wrap items-center gap-2'>
        <input type='date' value={from} onChange={e => e.target.value && setFrom(e.target.value)} className={field} />
        <span className='text-sm text-gray-500'>to</span>
        <input type='date' value={to} onChange={e => e.target.value && setTo(e.target.value)} className={field} />
        <Button variant='outline' size='sm' className='h-8' onClick={() => preset(7)}>Next 7 days</Button>
        <Button variant='outline' size='sm' className='h-8' onClick={() => preset(14)}>Next 14 days</Button>
        <Button variant='outline' size='sm' className='h-8' onClick={() => preset(30)}>Next 30 days</Button>
      </div>

      {state === 'loading' && <p className='text-sm text-gray-500'>Loading…</p>}
      {state === 'error' && (
        <p className='text-sm text-red-700'>Could not load. Refresh; if it keeps failing, Apaleo may be unreachable.</p>
      )}

      {state === 'ready' && data && (
        <>
          <section className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            <Figure label='Breakfasts' value={String(data.totals.covers)} big />
            <Figure label='Revenue' value={eur(data.totals.revenue)} big />
            <Figure label='Menu chosen' value={String(data.totals.chosen)} />
            <Figure
              label='Not chosen yet'
              value={String(data.totals.covers - data.totals.chosen)}
              warn={data.totals.covers - data.totals.chosen > 0}
            />
          </section>

          <p className='mt-2 text-xs text-gray-500'>
            {data.pricePerPerson != null
              ? `Price per person per morning: ${eur(data.pricePerPerson)} (from the Apaleo catalogue).`
              : 'The catalogue price could not be read, so revenue is not shown.'}
          </p>

          {data.days.length === 0 ? (
            <p className='mt-6 text-sm text-gray-500'>No breakfasts booked between these dates.</p>
          ) : (
            <div className='mt-6 overflow-x-auto'>
              <table className='w-full min-w-[560px] text-sm'>
                <thead>
                  <tr className='border-b text-left text-xs uppercase tracking-wide text-gray-500'>
                    <th className='py-2 pr-3'>Morning</th>
                    <th className='py-2 pr-3 text-right'>Breakfasts</th>
                    <th className='py-2 pr-3 text-right'>Bookings</th>
                    <th className='py-2 pr-3 text-right'>Chosen</th>
                    <th className='py-2 text-right'>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.days.map(d => (
                    <tr key={d.morning} className='border-b last:border-0'>
                      <td className='py-2 pr-3 font-medium'>{shortDate(d.morning)}</td>
                      <td className='py-2 pr-3 text-right'>{d.covers}</td>
                      <td className='py-2 pr-3 text-right text-gray-600'>{d.reservations}</td>
                      <td className={`py-2 pr-3 text-right ${d.chosen < d.covers ? 'text-amber-700' : ''}`}>
                        {d.chosen}
                      </td>
                      <td className='py-2 text-right'>{eur(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className='border-t-2 font-medium'>
                    <td className='py-2 pr-3'>Total</td>
                    <td className='py-2 pr-3 text-right'>{data.totals.covers}</td>
                    <td className='py-2 pr-3' />
                    <td className='py-2 pr-3 text-right'>{data.totals.chosen}</td>
                    <td className='py-2 text-right'>{eur(data.totals.revenue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  )
}

function Figure({ label, value, big, warn }: { label: string; value: string; big?: boolean; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${warn ? 'border-amber-500 bg-amber-50' : 'border-gray-200'}`}>
      <div className='text-xs uppercase tracking-wide text-gray-500'>{label}</div>
      <div className={`font-bold ${big ? 'text-3xl' : 'text-2xl'}`}>{value}</div>
    </div>
  )
}
