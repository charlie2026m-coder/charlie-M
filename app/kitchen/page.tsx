'use client'

/**
 * The kitchen's screen. Built for somebody who has never opened a computer.
 *
 * One question, answered in the largest type that fits: how many people are
 * coming to breakfast, which menus, at what time. Two big buttons jump to today
 * and tomorrow, two arrows step through any other day, one button at the bottom
 * goes to the door scanner, and that is the whole interface. No settings, no menus to edit, no money —
 * those live in the admin panel, behind a different login.
 *
 * German by default, because that is the language spoken on the pass; English
 * is one tap away and the choice is remembered on the device.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { MdChevronLeft, MdChevronRight, MdQrCodeScanner, MdRefresh } from 'react-icons/md'
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

  const jumpButton = (target: string, label: string) => (
    <button
      type='button'
      onClick={() => setMorning(target)}
      className={`h-16 flex-1 rounded-2xl text-2xl font-bold transition-colors ${
        morning === target ? 'bg-black text-white' : 'bg-gray-100 text-black hover:bg-gray-200'
      }`}
    >
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

  return (
    <main className='mx-auto w-full max-w-[900px] p-4 pb-32 sm:p-6'>
      <div className='mb-4 flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>{t.title}</h1>
        <div className='flex items-center gap-2'>
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
      </div>

      <div className='mb-3 flex gap-3'>
        {stepButton(-1, t.dayBefore)}
        {jumpButton(today, t.today)}
        {jumpButton(tomorrow, t.tomorrow)}
        {stepButton(1, t.dayAfter)}
      </div>
      <p className='mb-6 text-xl capitalize text-gray-700'>{dateLabel}</p>

      {state === 'loading' && <p className='text-2xl text-gray-500'>{t.loading}</p>}
      {state === 'error' && <p className='text-2xl text-red-700'>{t.error}</p>}

      {state === 'ready' && report && (
        <>
          <section className='rounded-3xl bg-black px-6 py-8 text-white'>
            <div className='text-7xl font-bold leading-none'>{report.covers}</div>
            <div className='mt-2 text-2xl'>{t.people(report.covers)}</div>
          </section>

          {report.covers === 0 ? (
            <p className='mt-8 text-2xl text-gray-500'>{t.nobody}</p>
          ) : (
            <>
              <section className='mt-8'>
                <h2 className='mb-3 text-xl font-bold'>{t.toCook}</h2>
                <ul className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                  {report.byMenu.map(m => (
                    <li key={m.code} className='rounded-2xl border-2 border-gray-200 p-4'>
                      <div className='flex items-center gap-2 text-lg font-medium'>
                        <MenuIcon name={m.icon} className='h-7 w-7 shrink-0' />
                        {m.name}
                      </div>
                      <div className='mt-1 text-5xl font-bold'>{m.persons}</div>
                    </li>
                  ))}
                  {notChosen > 0 && (
                    <li className='rounded-2xl border-2 border-dashed border-amber-500 bg-amber-50 p-4 text-amber-900'>
                      <div className='text-lg font-medium'>{t.noMenu}</div>
                      <div className='mt-1 text-5xl font-bold'>{notChosen}</div>
                    </li>
                  )}
                </ul>
              </section>

              <section className='mt-8'>
                <h2 className='mb-3 text-xl font-bold'>{t.times}</h2>
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

              <section className='mt-8'>
                <h2 className='mb-3 text-xl font-bold'>{t.list}</h2>
                <div className='overflow-x-auto'>
                  <table className='w-full min-w-[520px] text-lg'>
                    <thead>
                      <tr className='border-b-2 text-left text-sm uppercase tracking-wide text-gray-500'>
                        <th className='py-2 pr-3'>{t.room}</th>
                        <th className='py-2 pr-3'>{t.guest}</th>
                        <th className='py-2 pr-3'>{t.menu}</th>
                        <th className='py-2'>{t.time}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.lines.map(line => (
                        <tr key={line.reservationId} className='border-b'>
                          <td className='py-3 pr-3 text-2xl font-bold'>{line.room || '—'}</td>
                          <td className='py-3 pr-3'>
                            {line.guest || '—'}
                            <span className='block text-sm text-gray-600'>{t.people(line.persons)}</span>
                          </td>
                          <td className='py-3 pr-3'>
                            {line.menus.length === 0 ? (
                              <span className='text-amber-700'>{t.notChosen}</span>
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
                          <td className='py-3 font-bold'>
                            {line.slot ? `${line.slot.startsAt}–${line.slot.endsAt}` : <span className='font-normal text-gray-500'>{t.anyTime}</span>}
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
            </>
          )}
        </>
      )}

      <div className='fixed inset-x-0 bottom-0 border-t bg-white p-4'>
        <Link
          href='/kitchen/scan'
          className='mx-auto flex h-16 w-full max-w-[900px] items-center justify-center gap-3 rounded-2xl bg-black text-2xl font-bold text-white'
        >
          <MdQrCodeScanner className='h-8 w-8' /> {t.scan}
        </Link>
      </div>
    </main>
  )
}
