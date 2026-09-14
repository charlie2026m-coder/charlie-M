'use client'

/**
 * The kitchen's screen. Built for somebody who has never opened a computer.
 *
 * One question, answered in the largest type that fits: how many people are
 * coming to breakfast, which menus, at what time. A strip of seven mornings
 * carries the head count above each date — 11, 17, 0 — so the week is read at a
 * glance before anything is tapped; a tap opens the morning, two arrows move
 * the strip a week, one button goes to the door scanner, and that is the whole
 * interface. No settings, no menus to edit, no money — those live in the admin
 * panel, behind a different login.
 *
 * Every block carries a picture as well as a word, because the word may be in
 * the wrong language for whoever is on the pass that morning.
 *
 * On a phone it is one column with the scanner pinned to the bottom. On a
 * screen wide enough — the PC at reception, a tablet on its side — the number,
 * the sittings and the menus sit side by side so nothing has to be scrolled
 * for, and the scanner button moves up into the header.
 *
 * German by default, because that is the language spoken on the pass; English
 * is one tap away and the choice is remembered on the device.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  MdChatBubbleOutline,
  MdChevronLeft,
  MdChevronRight,
  MdGroups,
  MdHelpOutline,
  MdListAlt,
  MdQrCodeScanner,
  MdRefresh,
  MdRestaurantMenu,
  MdSchedule,
} from 'react-icons/md'
import { MenuIcon } from '@/app/_components/breakfast/MenuIcon'
import { addDays } from '@/lib/breakfastDates'

type Lang = 'de' | 'en'

const T = {
  de: {
    title: 'Frühstück',
    today: 'Heute',
    tomorrow: 'Morgen',
    weekBefore: 'Woche zurück',
    weekAfter: 'Woche vor',
    people: (n: number) => (n === 1 ? '1 Gast' : `${n} Gäste`),
    nobody: 'Niemand zum Frühstück.',
    toCook: 'Was kochen',
    noMenu: 'ohne Wahl — servieren, was da ist',
    times: 'Wann kommen sie',
    anyTime: 'keine Uhrzeit gewählt',
    list: 'Wer kommt',
    room: 'Zimmer',
    guest: 'Gast',
    menu: 'Menü',
    time: 'Uhrzeit',
    notChosen: 'nicht gewählt',
    came: 'da',
    scan: 'QR am Eingang scannen',
    reload: 'Neu laden',
    loading: 'Lädt …',
    error: 'Konnte nicht laden. Bitte neu laden.',
    locale: 'de-DE',
  },
  en: {
    title: 'Breakfast',
    today: 'Today',
    tomorrow: 'Tomorrow',
    weekBefore: 'Week back',
    weekAfter: 'Week ahead',
    people: (n: number) => (n === 1 ? '1 guest' : `${n} guests`),
    nobody: 'Nobody for breakfast.',
    toCook: 'What to cook',
    noMenu: 'no choice — serve what is on',
    times: 'When they come',
    anyTime: 'no time chosen',
    list: 'Who is coming',
    room: 'Room',
    guest: 'Guest',
    menu: 'Menu',
    time: 'Time',
    notChosen: 'not chosen',
    came: 'here',
    scan: 'Scan QR at the door',
    reload: 'Reload',
    loading: 'Loading…',
    error: 'Could not load. Please reload.',
    locale: 'en-GB',
  },
} as const

interface Line {
  reservationId: string
  guest: string
  room: string
  persons: number
  menus: { code: string; name: string; icon: string; persons: number }[]
  slot: { id: number; startsAt: string; endsAt: string } | null
  attendedPersons: number | null
  note?: string
}

interface Report {
  ok: true
  morning: string
  covers: number
  chosen: number
  byMenu: { code: string; name: string; icon: string; persons: number }[]
  bySitting: { id: number | null; label: string; persons: number; menus: { code: string; persons: number }[] }[]
  lines: Line[]
}

const berlinToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date())

/** A section title: picture first, word second. */
function Heading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className='mb-3 flex items-center gap-2 text-xl font-bold'>
      <span className='text-gray-500'>{icon}</span>
      {children}
    </h2>
  )
}

export default function KitchenPage() {
  const [lang, setLang] = useState<Lang>('de')
  // Any morning, not only today and tomorrow: the pass needs those two most,
  // but the week's shopping is planned further out. The strip shows seven
  // mornings from `windowStart`; the arrows move it a week, a tap picks a day.
  const [morning, setMorning] = useState(berlinToday)
  const [windowStart, setWindowStart] = useState(berlinToday)
  const [report, setReport] = useState<Report | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  // The head count for each morning of the strip, remembered with the week it
  // belongs to: a strip that has moved on shows "…" until its own numbers
  // arrive, never last week's under this week's dates. 'error' when the
  // numbers could not be read — the strip then shows "–" rather than a zero
  // that would look like an answer.
  const [counts, setCounts] = useState<{ from: string; days: Record<string, number> } | null | 'error'>(null)
  const t = T[lang]

  // Remembered per device, so the tablet on the pass stays in its language.
  useEffect(() => {
    // Deferred a tick, so the effect itself changes no state (react-hooks/set-state-in-effect).
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem('kitchen-lang')
        if (saved === 'de' || saved === 'en') setLang(saved)
      } catch {
        // No storage, no memory — German it is.
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const pick = (next: Lang) => {
    setLang(next)
    try {
      localStorage.setItem('kitchen-lang', next)
    } catch {
      // Same as above.
    }
  }

  const load = useCallback(async (date: string, locale: Lang) => {
    setState('loading')
    try {
      const res = await fetch(`/api/admin/breakfast/report?morning=${date}&locale=${locale}`, {
        cache: 'no-store',
      })
      if (!res.ok) return setState('error')
      setReport(await res.json())
      setState('ready')
    } catch {
      setState('error')
    }
  }, [])

  useEffect(() => {
    // Deferred a tick, so the effect itself changes no state (react-hooks/set-state-in-effect).
    const timer = window.setTimeout(() => void load(morning, lang), 0)
    return () => window.clearTimeout(timer)
  }, [load, morning, lang])

  const strip = Array.from({ length: 7 }, (_, i) => addDays(windowStart, i))
  const windowEnd = strip[6]

  // Seven mornings in one call, numbers only — see the counts route. Loaded
  // separately from the morning's report so a tap on a day never blanks the
  // week, and re-loaded on "reload" along with the report.
  const loadCounts = useCallback(async (from: string, to: string) => {
    try {
      const res = await fetch(`/api/admin/breakfast/counts?from=${from}&to=${to}`, { cache: 'no-store' })
      if (!res.ok) return setCounts('error')
      const json = (await res.json()) as { days?: { morning: string; covers: number }[] }
      const days: Record<string, number> = {}
      for (const d of json.days ?? []) days[d.morning] = d.covers
      setCounts({ from, days })
    } catch {
      setCounts('error')
    }
  }, [])

  useEffect(() => {
    // Deferred a tick, so the effect itself changes no state (react-hooks/set-state-in-effect).
    const timer = window.setTimeout(() => void loadCounts(windowStart, windowEnd), 0)
    return () => window.clearTimeout(timer)
  }, [loadCounts, windowStart, windowEnd])

  // Move the strip a week; keep the chosen morning if it is still on the
  // strip, otherwise land on the strip's first day.
  const shiftWeek = (days: number) => {
    const start = addDays(windowStart, days)
    setWindowStart(start)
    const end = addDays(start, 6)
    if (morning < start || morning > end) setMorning(start)
  }

  const dateLabel = new Intl.DateTimeFormat(t.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${morning}T00:00:00Z`))

  const notChosen = report ? report.covers - report.chosen : 0

  const today = berlinToday()
  const tomorrow = addDays(today, 1)

  /** The number above a date: what the strip knows, or the fresher report
   *  for the morning that is open. "…" while loading, "–" when unreadable —
   *  never a zero that only looks like an answer. */
  const countFor = (day: string): string => {
    if (report && state === 'ready' && report.morning === day) return String(report.covers)
    if (counts === 'error') return '–'
    if (counts === null || counts.from !== windowStart) return '…'
    return String(counts.days[day] ?? 0)
  }

  const dayName = (day: string): string => {
    if (day === today) return t.today
    if (day === tomorrow) return t.tomorrow
    return new Intl.DateTimeFormat(t.locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`))
  }
  const dayNumber = (day: string): string =>
    new Intl.DateTimeFormat(t.locale, { day: 'numeric', month: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`))

  const dayChip = (day: string) => {
    const selected = morning === day
    return (
      <button
        key={day}
        type='button'
        onClick={() => setMorning(day)}
        aria-pressed={selected}
        className={`flex h-24 min-w-[84px] flex-1 flex-col items-center justify-center rounded-2xl leading-none transition-colors ${
          selected ? 'bg-black text-white' : 'bg-gray-100 text-black hover:bg-gray-200'
        }`}
      >
        <span className='text-3xl font-bold tabular-nums'>{countFor(day)}</span>
        <span className='mt-2 text-base font-bold'>{dayName(day)}</span>
        <span className={`mt-1 text-sm ${selected ? 'text-white/70' : 'text-gray-500'}`}>{dayNumber(day)}</span>
      </button>
    )
  }

  const stepButton = (days: number, label: string) => (
    <button
      type='button'
      onClick={() => shiftWeek(days)}
      aria-label={label}
      title={label}
      className='flex h-24 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-black hover:bg-gray-200'
    >
      {days < 0 ? <MdChevronLeft className='h-9 w-9' /> : <MdChevronRight className='h-9 w-9' />}
    </button>
  )

  const scanButton = (className: string) => (
    <Link
      href='/kitchen/scan'
      className={`flex items-center justify-center gap-3 rounded-2xl bg-black font-bold text-white ${className}`}
    >
      <MdQrCodeScanner className='h-8 w-8' /> {t.scan}
    </Link>
  )

  return (
    <main className='mx-auto w-full max-w-[1400px] p-4 pb-10 sm:p-6'>
      {/* Header: title, controls, and — on a wide screen — the scanner. */}
      <div className='mb-4 flex flex-wrap items-center gap-3'>
        <h1 className='flex items-center gap-2 text-2xl font-bold'>
          <MdRestaurantMenu className='h-7 w-7' /> {t.title}
        </h1>
        <div className='ml-auto flex items-center gap-2'>
          <button
            type='button'
            onClick={() => {
              void load(morning, lang)
              void loadCounts(windowStart, windowEnd)
            }}
            className='inline-flex h-10 items-center gap-1 rounded-xl border border-gray-300 px-3 text-sm'
          >
            <MdRefresh /> {t.reload}
          </button>
          <div className='flex overflow-hidden rounded-xl border border-gray-300 text-sm'>
            {(['de', 'en'] as Lang[]).map(l => (
              <button
                key={l}
                type='button'
                onClick={() => pick(l)}
                className={`h-10 px-3 uppercase ${lang === l ? 'bg-black text-white' : 'bg-white'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        {scanButton('hidden h-12 px-5 text-lg lg:flex')}
      </div>

      {/* Phone and tablet: the scanner is the first thing under the title —
          in the flow, not pinned to the bottom. A bar fixed or stuck to the
          bottom of the screen fought the browser's own toolbars on iOS and
          the page could not be scrolled back up. */}
      {scanButton('mb-4 h-16 w-full text-2xl lg:hidden')}

      {/* Seven mornings, the head count above each date. On a phone the strip
          scrolls sideways under the thumb; on a wide screen it sits whole. */}
      <div className='scrollbar-hide mb-3 flex items-stretch gap-2 overflow-x-auto pb-1 lg:max-w-[980px]'>
        {stepButton(-7, t.weekBefore)}
        {strip.map(dayChip)}
        {stepButton(7, t.weekAfter)}
      </div>
      <p className='mb-6 text-xl capitalize text-gray-700'>{dateLabel}</p>

      {state === 'loading' && <p className='text-2xl text-gray-500'>{t.loading}</p>}
      {state === 'error' && <p className='text-2xl text-red-700'>{t.error}</p>}

      {state === 'ready' && report && (
        <>
          {/* Wide screens: the number and the sittings on the left, the menus on
              the right, so the three answers are visible without scrolling. */}
          <div className='grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start'>
            <div className='flex flex-col gap-6'>
              <section className='flex items-center gap-5 rounded-3xl bg-black px-6 py-8 text-white'>
                <MdGroups className='h-20 w-20 shrink-0 opacity-80' />
                <div>
                  <div className='text-7xl font-bold leading-none'>{report.covers}</div>
                  <div className='mt-2 text-2xl'>{t.people(report.covers)}</div>
                </div>
              </section>

              {report.covers > 0 && (
                <section>
                  <Heading icon={<MdSchedule className='h-7 w-7' />}>{t.times}</Heading>
                  <ul className='divide-y-2 rounded-2xl border-2 border-gray-200'>
                    {report.bySitting.map(s => (
                      <li key={s.id ?? 'none'} className='flex items-center justify-between gap-3 px-5 py-4'>
                        <span className='text-2xl font-bold'>{s.id == null ? t.anyTime : s.label}</span>
                        <span className='text-right'>
                          <span className='text-3xl font-bold'>{s.persons}</span>
                          <span className='block text-sm text-gray-600'>
                            {s.menus.map(m => `${m.persons}× ${m.code}`).join(' · ')}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {report.covers === 0 ? (
              <p className='text-2xl text-gray-500'>{t.nobody}</p>
            ) : (
              <section>
                <Heading icon={<MdRestaurantMenu className='h-7 w-7' />}>{t.toCook}</Heading>
                <ul className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                  {report.byMenu.map(m => (
                    <li key={m.code} className='rounded-2xl border-2 border-gray-200 p-4'>
                      <div className='flex items-center gap-2 text-lg font-medium'>
                        <MenuIcon name={m.icon} className='h-8 w-8 shrink-0' />
                        {m.name}
                      </div>
                      <div className='mt-1 text-5xl font-bold'>{m.persons}</div>
                    </li>
                  ))}
                  {notChosen > 0 && (
                    <li className='rounded-2xl border-2 border-dashed border-amber-500 bg-amber-50 p-4 text-amber-900'>
                      <div className='flex items-center gap-2 text-lg font-medium'>
                        <MdHelpOutline className='h-8 w-8 shrink-0' />
                        {t.noMenu}
                      </div>
                      <div className='mt-1 text-5xl font-bold'>{notChosen}</div>
                    </li>
                  )}
                </ul>
              </section>
            )}
          </div>

          {report.covers > 0 && (
            <section className='mt-8'>
              <Heading icon={<MdListAlt className='h-7 w-7' />}>{t.list}</Heading>
              <div className='overflow-x-auto rounded-2xl border-2 border-gray-200'>
                <table className='w-full min-w-[520px] text-lg'>
                  <thead>
                    <tr className='border-b-2 bg-gray-50 text-left text-sm uppercase tracking-wide text-gray-500'>
                      <th className='px-4 py-2'>{t.room}</th>
                      <th className='px-4 py-2'>{t.guest}</th>
                      <th className='px-4 py-2'>{t.menu}</th>
                      <th className='px-4 py-2'>{t.time}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.lines.map(line => (
                      <tr key={line.reservationId} className='border-b last:border-0'>
                        <td className='px-4 py-3 text-2xl font-bold'>{line.room || '—'}</td>
                        <td className='px-4 py-3'>
                          {line.guest || '—'}
                          <span className='block text-sm text-gray-600'>{t.people(line.persons)}</span>
                          {line.note && (
                            <span className='mt-1 inline-flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-base text-amber-900'>
                              <MdChatBubbleOutline className='mt-0.5 h-4 w-4 shrink-0' />
                              {line.note}
                            </span>
                          )}
                        </td>
                        <td className='px-4 py-3'>
                          {line.menus.length === 0 ? (
                            <span className='inline-flex items-center gap-1 text-amber-700'>
                              <MdHelpOutline className='h-5 w-5' /> {t.notChosen}
                            </span>
                          ) : (
                            <span className='flex flex-wrap gap-x-3 gap-y-1'>
                              {line.menus.map(m => (
                                <span key={m.code} className='inline-flex items-center gap-1'>
                                  <MenuIcon name={m.icon} className='h-5 w-5 shrink-0' />
                                  {m.persons}× {m.name}
                                </span>
                              ))}
                            </span>
                          )}
                        </td>
                        <td className='px-4 py-3 font-bold'>
                          {line.slot ? (
                            `${line.slot.startsAt}–${line.slot.endsAt}`
                          ) : (
                            <span className='font-normal text-gray-500'>{t.anyTime}</span>
                          )}
                          {line.attendedPersons != null && (
                            <span className='ml-2 rounded-full bg-green-100 px-2 py-0.5 text-sm font-medium text-green-800'>
                              ✓ {t.came}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

    </main>
  )
}
