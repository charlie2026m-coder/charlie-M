'use client'

/**
 * Guest-facing breakfast page, reached by the token link we send through
 * Guestway and kept for the QR at the dining-room door.
 *
 * API:
 *   GET  /api/public/breakfast/{token}?locale=de   → the mornings and choices
 *   POST /api/public/breakfast/{token}             → { morning, menuCode, slotId }
 *   GET  /api/public/breakfast/{token}/qr          → the door code
 *
 * Deliberately outside [locale]: the link is opened from a message, not from
 * the site's navigation, so the language comes from the URL (?lang=de) or the
 * browser rather than from a locale prefix the guest would have to carry.
 */

import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { T, fmt, niceDate, type Lang, type TKey } from './translations'
import { MenuIcon } from '@/app/_components/breakfast/MenuIcon'
import { MenuChips } from '@/app/_components/breakfast/MenuChips'
import { Button } from '@/app/_components/ui/button'

interface MenuView {
  code: string
  icon: string
  name: string
  description: string
  items: string[]
  allergens: string
  photoUrl: string | null
}

interface SlotView {
  id: number
  startsAt: string
  endsAt: string
  capacity: number
  seatsLeft: number
}

interface MorningView {
  morning: string
  persons: number
  menus: MenuView[]
  slots: SlotView[]
  chosenMenu: string | null
  chosenSlot: number | null
  attendedAt: string | null
}

interface ViewData {
  ok: true
  reservationId: string
  guestFirstName: string
  mornings: MorningView[]
  needsChoice: boolean
}

type State = ViewData | 'loading' | 'unknown' | 'net_error'

/** Per-morning UI state. Kept beside the data rather than inside it so a
 *  refetch cannot silently discard what the guest is in the middle of doing. */
interface Draft {
  menu: string | null
  slot: number | null
  status: 'idle' | 'saving' | 'saved' | 'error'
  error?: string
}

export default function BreakfastPage() {
  const params = useParams<{ token: string }>()
  const search = useSearchParams()
  const token = String(params?.token ?? '')

  const [lang, setLang] = useState<Lang>('en')
  const [data, setData] = useState<State>('loading')
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})

  // Language: an explicit ?lang wins, otherwise the browser. Read in an effect
  // because navigator does not exist while the page is being prerendered.
  useEffect(() => {
    const q = search?.get('lang')
    if (q === 'de' || q === 'en') return setLang(q)
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('de')) {
      setLang('de')
    }
  }, [search])

  const t = (key: TKey) => T[lang][key]

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/breakfast/${encodeURIComponent(token)}?locale=${lang}`, {
        cache: 'no-store',
      })
      if (res.status === 404) return setData('unknown')
      if (!res.ok) return setData('net_error')
      const json = (await res.json()) as ViewData
      setData(json)
      // Seed the drafts from what is already stored, so the current choice is
      // visible as selected rather than the guest having to re-pick it.
      setDrafts(prev => {
        const next = { ...prev }
        for (const m of json.mornings) {
          if (!next[m.morning]) next[m.morning] = { menu: m.chosenMenu, slot: m.chosenSlot, status: 'idle' }
        }
        return next
      })
    } catch {
      setData('net_error')
    }
  }, [token, lang])

  useEffect(() => {
    void load()
  }, [load])

  const save = async (morning: string) => {
    const draft = drafts[morning]
    if (!draft?.menu || draft.slot == null) {
      setDrafts(d => ({ ...d, [morning]: { ...d[morning], status: 'error', error: t('chooseBoth') } }))
      return
    }
    setDrafts(d => ({ ...d, [morning]: { ...d[morning], status: 'saving', error: undefined } }))
    try {
      const res = await fetch(`/api/public/breakfast/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ morning, menuCode: draft.menu, slotId: draft.slot }),
      })
      const json = (await res.json()) as { ok: boolean; reason?: string }
      if (json.ok) {
        setDrafts(d => ({ ...d, [morning]: { ...d[morning], status: 'saved' } }))
        // Refetch so the seat counts everyone else sees update here too.
        void load()
        return
      }
      setDrafts(d => ({
        ...d,
        [morning]: {
          ...d[morning],
          status: 'error',
          error: json.reason === 'slot_full' ? t('slotFull') : t('failed'),
        },
      }))
      if (json.reason === 'slot_full') void load()
    } catch {
      setDrafts(d => ({ ...d, [morning]: { ...d[morning], status: 'error', error: t('failed') } }))
    }
  }

  if (data === 'loading') return <Shell><p className='text-mute'>{t('loading')}</p></Shell>
  if (data === 'unknown') return <Shell><Notice title={t('unknownTitle')} msg={t('unknownMsg')} /></Shell>
  if (data === 'net_error') return <Shell><Notice title={t('netTitle')} msg={t('netMsg')} /></Shell>

  const greeting = data.guestFirstName
    ? fmt(t('hello'), { name: data.guestFirstName })
    : t('helloNoName')

  // Every distinct menu of the stay, in the order it first appears. The same
  // four menus are on offer every morning, so describing them under each date
  // would print the same four cards four times over.
  const menuLegend: MenuView[] = (() => {
    const seen = new Map<string, MenuView>()
    for (const m of data.mornings) {
      for (const menu of m.menus) if (!seen.has(menu.code)) seen.set(menu.code, menu)
    }
    return [...seen.values()]
  })()

  return (
    <Shell>
      <h1 className='text-2xl font-semibold mb-1'>{t('title')}</h1>
      <p className='mb-1'>{greeting}</p>

      {data.mornings.length === 0 ? (
        <Notice title={t('nothingTitle')} msg={t('nothingMsg')} />
      ) : (
        <>
          <p className='text-mute mb-6'>{t('intro')}</p>

          {/* The door code sits at the top: on the morning itself this is the
              only thing the guest opens the page for. */}
          <section className='mb-8 rounded-2xl border bg-white p-5 text-center'>
            <h2 className='font-medium mb-1'>{t('qrTitle')}</h2>
            <p className='text-mute text-sm mb-4'>{t('qrMsg')}</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- an SVG QR
                from our own route; next/image would only add a proxy hop. */}
            <img
              src={`/api/public/breakfast/${encodeURIComponent(token)}/qr`}
              alt=''
              aria-hidden
              className='mx-auto h-44 w-44'
            />
          </section>

          {menuLegend.length > 0 && (
            <details className='mb-6 rounded-2xl border bg-white p-5'>
              <summary className='cursor-pointer font-medium'>{t('whatsIn')}</summary>
              <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                {menuLegend.map(menu => (
                  <div key={menu.code}>
                    <div className='flex items-center gap-2 font-medium'>
                      <MenuIcon name={menu.icon} className='h-[18px] w-[18px] shrink-0' />
                      {menu.name}
                    </div>
                    {menu.description && (
                      <p className='text-sm text-mute'>{menu.description}</p>
                    )}
                    {menu.items.length > 0 && (
                      <p className='mt-1 text-sm'>{menu.items.join(' · ')}</p>
                    )}
                    {menu.allergens && (
                      <p className='mt-1 text-xs text-mute'>
                        {fmt(t('allergens'), { list: menu.allergens })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}

          {data.mornings.map(m => {
            const draft = drafts[m.morning] ?? { menu: m.chosenMenu, slot: m.chosenSlot, status: 'idle' as const }
            const set = (patch: Partial<Draft>) =>
              setDrafts(d => ({ ...d, [m.morning]: { ...draft, ...patch, status: 'idle', error: undefined } }))

            return (
              <section key={m.morning} className='mb-6 rounded-2xl border bg-white p-5'>
                <header className='mb-4'>
                  <h2 className='text-lg font-medium'>{niceDate(m.morning, lang)}</h2>
                  <p className='text-mute text-sm'>
                    {fmt(m.persons === 1 ? t('persons') : t('personsPlural'), { count: m.persons })}
                    {m.attendedAt ? ` · ${t('attended')}` : ''}
                  </p>
                </header>

                {m.menus.length === 0 ? (
                  <p className='text-mute text-sm'>{t('noMenus')}</p>
                ) : (
                  <>
                    <fieldset className='mb-5'>
                      <legend className='text-xs font-medium uppercase tracking-[0.14em] text-mute mb-2'>
                        {t('menuLabel')}
                      </legend>
                      <MenuChips
                        options={m.menus}
                        picked={draft.menu ?? undefined}
                        onPick={code => set({ menu: code })}
                        disabled={!!m.attendedAt}
                        randomLabel={t('random')}
                      />
                    </fieldset>

                    <fieldset className='mb-5'>
                      <legend className='text-xs font-medium uppercase tracking-[0.14em] text-mute mb-2'>
                        {t('timeLabel')}
                      </legend>
                      <div className='flex flex-wrap gap-2'>
                        {m.slots.map(s => {
                          // A slot the guest already holds stays selectable even
                          // at zero left — those seats are theirs. For the rest,
                          // seatsLeft already excludes this reservation, so it has
                          // to cover the whole party: offering a sitting with one
                          // seat left to a couple only earns them a slot_full.
                          const mine = m.chosenSlot === s.id
                          const full = s.seatsLeft < m.persons && !mine
                          return (
                            <button
                              key={s.id}
                              type='button'
                              disabled={full || !!m.attendedAt}
                              onClick={() => set({ slot: s.id })}
                              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                                draft.slot === s.id
                                  ? 'border-dark-gold bg-blue text-mute'
                                  : 'hover:bg-black/[0.03]'
                              } ${full ? 'cursor-not-allowed opacity-40' : ''}`}
                            >
                              {s.startsAt}–{s.endsAt}
                              <span className='ml-2 text-xs opacity-70'>
                                {full ? t('seatsNone') : fmt(t('seatsLeft'), { count: s.seatsLeft })}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </fieldset>

                    {!m.attendedAt && (
                      <div className='flex flex-wrap items-center gap-3'>
                        <Button
                          type='button'
                          onClick={() => void save(m.morning)}
                          disabled={draft.status === 'saving'}
                          className='h-[45px] px-6 text-base'
                        >
                          {draft.status === 'saving' ? t('saving') : t('save')}
                        </Button>
                        {draft.status === 'saved' && (
                          <span className='text-sm text-green'>{t('saved')}</span>
                        )}
                        {draft.status === 'error' && draft.error && (
                          <span className='text-sm text-red'>{draft.error}</span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </section>
            )
          })}
        </>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className='mx-auto w-full max-w-[640px] px-4 py-10'>{children}</main>
  )
}

function Notice({ title, msg }: { title: string; msg: string }) {
  return (
    <section className='rounded-2xl border bg-white p-6'>
      <h2 className='mb-1 font-medium'>{title}</h2>
      <p className='text-mute text-sm'>{msg}</p>
    </section>
  )
}
