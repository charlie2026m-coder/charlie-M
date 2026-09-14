'use client'

/**
 * The kitchen's morning sheet.
 *
 * Read the evening before, so it opens on tomorrow. The number that matters is
 * COVERS — everybody breakfast is paid for, including the guests who never
 * opened their link and therefore have no menu on file. Those appear in the
 * list as "not chosen" rather than being left out, because a report that
 * counted only the decided guests would under-cater by exactly the people who
 * could not be bothered to choose.
 *
 * Built to be printed as well as read: the controls disappear on paper and the
 * list keeps its rows together.
 */

import { useCallback, useEffect, useState } from 'react'
import { MdChevronLeft, MdChevronRight, MdPrint, MdRefresh } from 'react-icons/md'
import { Button } from '@/app/_components/ui/button'
import { MenuIcon } from '@/app/_components/breakfast/MenuIcon'
import { PageHeader } from '@/app/_components/admin/PageHeader'
import { addDays } from '@/lib/breakfastDates'

interface Line {
  reservationId: string
  guest: string
  room: string
  persons: number
  menus: { code: string; name: string; icon: string; persons: number }[]
  slot: { id: number; startsAt: string; endsAt: string } | null
  attendedPersons: number | null
}

interface Report {
  ok: true
  morning: string
  covers: number
  chosen: number
  byMenu: { code: string; name: string; icon: string; persons: number }[]
  bySitting: {
    id: number | null
    label: string
    persons: number
    menus: { code: string; persons: number }[]
  }[]
  lines: Line[]
}

const berlinToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date())

const longDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`))

export default function BreakfastReportPage() {
  // Tomorrow: the sheet is prepped the night before.
  const [morning, setMorning] = useState(() => addDays(berlinToday(), 1))
  const [report, setReport] = useState<Report | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  const load = useCallback(async (date: string) => {
    setState('loading')
    try {
      const res = await fetch(`/api/admin/breakfast/report?morning=${date}`, { cache: 'no-store' })
      if (!res.ok) return setState('error')
      setReport(await res.json())
      setState('ready')
    } catch {
      setState('error')
    }
  }, [])

  useEffect(() => {
    void load(morning)
  }, [load, morning])

  // Opened from the home page with a morning in the URL: show that one.
  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get('morning')
    if (asked && /^\d{4}-\d{2}-\d{2}$/.test(asked)) setMorning(asked)
  }, [])

  const shift = (days: number) => setMorning(d => addDays(d, days))
  const notChosen = report ? report.covers - report.chosen : 0

  return (
    <main className='mx-auto w-full max-w-[900px] p-4 pb-16 sm:p-6'>
      <PageHeader
        className='print:hidden'
        title='Kitchen sheet'
        description='Everybody with breakfast on a morning and what they chose. Prep from the covers, not from the choices — the ones without a menu still come.'
        actions={
          <>
            <Button variant='outline' size='sm' className='h-8' onClick={() => void load(morning)}>
              <MdRefresh /> Refresh
            </Button>
            <Button variant='outline' size='sm' className='h-8' onClick={() => window.print()}>
              <MdPrint /> Print
            </Button>
          </>
        }
      />

      <div className='mb-6 flex flex-wrap items-center gap-2 print:hidden'>
        <Button variant='outline' size='sm' className='h-8' onClick={() => shift(-1)}>
          <MdChevronLeft />
        </Button>
        <input
          type='date'
          value={morning}
          onChange={e => e.target.value && setMorning(e.target.value)}
          className='h-8 rounded-lg border border-gray-300 px-2 text-sm'
        />
        <Button variant='outline' size='sm' className='h-8' onClick={() => shift(1)}>
          <MdChevronRight />
        </Button>
        <Button
          variant='outline'
          size='sm'
          className='h-8'
          onClick={() => setMorning(berlinToday())}
        >
          Today
        </Button>
        <Button
          variant='outline'
          size='sm'
          className='h-8'
          onClick={() => setMorning(addDays(berlinToday(), 1))}
        >
          Tomorrow
        </Button>
      </div>

      <h2 className='text-lg font-medium text-black'>{longDate(morning)}</h2>

      {state === 'loading' && <p className='mt-4 text-sm text-gray-500'>Loading…</p>}
      {state === 'error' && (
        <p className='mt-4 text-sm text-red-700'>
          Could not load the sheet. Refresh, and if it keeps failing check that Apaleo is reachable.
        </p>
      )}

      {state === 'ready' && report && (
        <>
          <section className='mt-4 grid grid-cols-3 gap-3'>
            <Figure label='Covers' value={report.covers} big />
            <Figure label='Menu chosen' value={report.chosen} />
            <Figure label='No menu' value={notChosen} warn={notChosen > 0} />
          </section>

          {report.covers === 0 ? (
            <p className='mt-6 text-sm text-gray-500'>
              Nobody has breakfast booked for this morning.
            </p>
          ) : (
            <>
              {report.byMenu.length > 0 && (
                <section className='mt-8'>
                  <h3 className='mb-2 text-xs font-medium uppercase tracking-[0.14em] text-gray-500'>
                    To cook
                  </h3>
                  <ul className='flex flex-wrap gap-2'>
                    {report.byMenu.map(m => (
                      <li
                        key={m.code}
                        className='inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2'
                      >
                        <MenuIcon name={m.icon} className='h-5 w-5 shrink-0' />
                        <span className='text-lg font-medium'>{m.persons}×</span>
                        <span className='text-sm'>{m.name}</span>
                      </li>
                    ))}
                    {notChosen > 0 && (
                      <li className='inline-flex items-center gap-2 rounded-xl border border-dashed border-amber-500 bg-amber-50 px-4 py-2 text-amber-900'>
                        <span className='text-lg font-medium'>{notChosen}×</span>
                        <span className='text-sm'>no menu chosen — serve anything</span>
                      </li>
                    )}
                  </ul>
                </section>
              )}

              <section className='mt-8'>
                <h3 className='mb-2 text-xs font-medium uppercase tracking-[0.14em] text-gray-500'>
                  By sitting
                </h3>
                <ul className='divide-y rounded-xl border border-gray-200'>
                  {report.bySitting.map(s => (
                    <li
                      key={s.id ?? 'none'}
                      className='flex flex-wrap items-center justify-between gap-3 px-4 py-3'
                    >
                      <span className='font-medium'>{s.label}</span>
                      <span className='flex flex-wrap items-center gap-3 text-sm text-gray-600'>
                        {s.menus.map(m => (
                          <span key={m.code}>
                            {m.persons}× {m.code}
                          </span>
                        ))}
                        <span className='font-medium text-black'>{s.persons} people</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className='mt-8'>
                <h3 className='mb-2 text-xs font-medium uppercase tracking-[0.14em] text-gray-500'>
                  Every booking
                </h3>
                <div className='overflow-x-auto'>
                  <table className='w-full min-w-[560px] text-sm'>
                    <thead>
                      <tr className='border-b text-left text-xs uppercase tracking-wide text-gray-500'>
                        <th className='py-2 pr-3'>Room</th>
                        <th className='py-2 pr-3'>Guest</th>
                        <th className='py-2 pr-3'>People</th>
                        <th className='py-2 pr-3'>Menu</th>
                        <th className='py-2'>Sitting</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.lines.map(line => (
                        <tr
                          key={line.reservationId}
                          className='break-inside-avoid border-b last:border-0'
                        >
                          <td className='py-2 pr-3 font-medium'>{line.room || '—'}</td>
                          <td className='py-2 pr-3'>{line.guest || '—'}</td>
                          <td className='py-2 pr-3'>{line.persons}</td>
                          <td className='py-2 pr-3'>
                            {line.menus.length === 0 ? (
                              <span className='text-amber-700'>not chosen</span>
                            ) : (
                              <span className='flex flex-wrap items-center gap-2'>
                                {line.menus.map(m => (
                                  <span key={m.code} className='inline-flex items-center gap-1'>
                                    <MenuIcon name={m.icon} className='h-4 w-4 shrink-0' />
                                    {m.persons}× {m.name}
                                  </span>
                                ))}
                              </span>
                            )}
                          </td>
                          <td className='py-2'>
                            {line.slot ? (
                              `${line.slot.startsAt}–${line.slot.endsAt}`
                            ) : (
                              <span className='text-gray-500'>any</span>
                            )}
                            {line.attendedPersons != null && (
                              <span className='ml-2 text-xs text-green-700'>came</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </main>
  )
}

function Figure({
  label,
  value,
  big,
  warn,
}: {
  label: string
  value: number
  big?: boolean
  warn?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${warn ? 'border-amber-500 bg-amber-50' : 'border-gray-200'}`}
    >
      <div className='text-xs uppercase tracking-wide text-gray-500'>{label}</div>
      <div className={`font-bold ${big ? 'text-4xl' : 'text-2xl'}`}>{value}</div>
    </div>
  )
}
