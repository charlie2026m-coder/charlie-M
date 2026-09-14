'use client'

/**
 * The kitchen's screen. Built for somebody who has never opened a computer.
 *
 * One question, answered in the largest type that fits: how many people are
 * coming to breakfast, which menus, at what time. Two big buttons jump to today
 * and tomorrow, two arrows step through any other day, one button goes to the
 * door scanner, and that is the whole interface. No settings, no menus to edit,
 * no money — those live in the admin panel, behind a different login.
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
  MdChevronLeft,
  MdChevronRight,
  MdEvent,
  MdGroups,
  MdHelpOutline,
  MdListAlt,
  MdQrCodeScanner,
  MdRefresh,
  MdRestaurantMenu,
  MdSchedule,
  MdToday,
} from 'react-icons/md'
import { MenuIcon } from '@/app/_components/breakfast/MenuIcon'
import { addDays } from '@/lib/breakfastDates'

type Lang = 'de' | 'en'

const T = {
  de: {
    title: 'Frühstück',
    today: 'Heute',
    tomorrow: 'Morgen',
    dayBefore: 'Vorheriger Tag',
    dayAfter: 'Nächster Tag',
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
    dayBefore: 'Previous day',
    dayAfter: 'Next day',
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
  // but the week's shopping is planned further out, so the arrows step a day
  // at a time and the two big buttons jump straight back.
  const [morning, setMorning] = useState(berlinToday)
  const [report, setReport] = useState<Report | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const t = T[lang]

  // Remembered per device, so the tablet on the pass stays in its language.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kitchen-lang')
      if (saved === 'de' || saved === 'en') setLang(saved)
    } catch {
      // No storage, no memory — German it is.
    }
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
    void load(morning, lang)
  }, [load, morning, lang])

  const dateLabel = new Intl.DateTimeFormat(t.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${morning}T00:00:00Z`))

  const notChosen = report ? report.covers - report.chosen : 0

  const today = berlinToday()
  const tomorrow = addDays(today, 1)

  const jumpButton = (target: string, label: string, icon: React.ReactNode) => (
    <button
      type='button'
      onClick={() => setMorning(target)}
      className={`flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl text-2xl font-bold transition-colors ${
        morning === target ? 'bg-black text-white' : 'bg-gray-100 text-black hover:bg-gray-200'
      }`}
    >
      {icon}
      {label}
    </button>
  )

  const stepButton = (days: number, label: string) => (
    <button
      type='button'
      onClick={() => setMorning(m => addDays(m, days))}
      aria-label={label}
      title={label}
      className='flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-black hover:bg-gray-200'
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
    <main className='mx-auto w-full max-w-[1400px] p-4 pb-32 sm:p-6 lg:pb-8'>
      {/* Header: title, controls, and — on a wide screen — the scanner. */}
      <div className='mb-4 flex flex-wrap items-center gap-3'>
        <h1 className='flex items-center gap-2 text-2xl font-bold'>
          <MdRestaurantMenu className='h-7 w-7' /> {t.title}
        </h1>
        <div className='ml-auto flex items-center gap-2'>
          <button
            type='button'
            onClick={() => void load(morning, lang)}
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

      <div className='mb-3 flex gap-3 lg:max-w-[720px]'>
        {stepButton(-1, t.dayBefore)}
        {jumpButton(today, t.today, <MdToday className='h-7 w-7' />)}
        {jumpButton(tomorrow, t.tomorrow, <MdEvent className='h-7 w-7' />)}
        {stepButton(1, t.dayAfter)}
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

      {/* Phone and tablet: the scanner stays under the thumb. */}
      <div className='fixed inset-x-0 bottom-0 border-t bg-white p-4 lg:hidden'>
        {scanButton('mx-auto h-16 w-full max-w-[900px] text-2xl')}
      </div>
    </main>
  )
}
