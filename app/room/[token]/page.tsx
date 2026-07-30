'use client'

/**
 * In-room QR → "open my booking".
 *
 * A permanent sticker in each room. The guest scans it, proves the stay is
 * theirs with their surname, and lands in their own cabinet, where breakfast,
 * a late check-out, extra cleaning, parking, a cot or pets can be booked
 * without calling anyone.
 *
 *   GET  /api/public/room/{token}   → { ok, room, occupied }   (never the name)
 *   POST /api/public/room/{token}   → { ok, reservationId }    (surname check)
 *
 * On success: ensure an anonymous Supabase session, link the reservation, then
 * a FULL navigation so the fresh session cookie reaches the protected cabinet.
 *
 * Borrows the self-checkout card styling next door so the two in-room screens
 * look like one family — a guest scans both stickers in the same room. Lives
 * outside app/[locale] (like /checkout) so the printed URL carries no language
 * and never has to be reprinted.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import sco from '../../checkout/[token]/page.module.css'
import styles from './page.module.css'
import { T, fmt, type Lang, type TKey } from './translations'

type Phase =
  | { k: 'loading' }
  | { k: 'net_error' }
  | { k: 'ask'; room: string }
  | { k: 'info'; title: string; msg: string; tone: 'warn' | 'bed' }

function Badge({ tone }: { tone: 'warn' | 'bed' }) {
  return (
    <span className={sco.badge}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {tone === 'bed' ? (
          <>
            <path d="M3 18V7m0 6h18v5" />
            <path d="M21 18v-4a3 3 0 0 0-3-3h-7" />
            <circle cx="7.5" cy="10.5" r="2" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5" />
            <path d="M12 16.5v.01" />
          </>
        )}
      </svg>
    </span>
  )
}

export default function RoomAccessPage() {
  const params = useParams<{ token: string }>()
  const raw = params?.token
  const token = Array.isArray(raw) ? raw[0] : (raw ?? '')

  const [lang, setLang] = useState<Lang>('de')
  const [phase, setPhase] = useState<Phase>({ k: 'loading' })
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const t = useCallback((k: TKey): string => T[lang][k], [lang])

  // Shares the self-checkout language choice: same guest, same room, same trip.
  useEffect(() => {
    const saved = localStorage.getItem('sco_lang')
    if (saved === 'en' || saved === 'de') setLang(saved)
  }, [])

  const switchLang = (l: Lang) => {
    setLang(l)
    localStorage.setItem('sco_lang', l)
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!token) {
        setPhase({ k: 'info', title: T[lang].invT, msg: T[lang].invM, tone: 'warn' })
        return
      }
      try {
        const res = await fetch(`/api/public/room/${encodeURIComponent(token)}`)
        const d = await res.json()
        if (cancelled) return
        if (!d?.ok) {
          setPhase({ k: 'info', title: T[lang].invT, msg: T[lang].invM, tone: 'warn' })
          return
        }
        if (!d.occupied) {
          setPhase({ k: 'info', title: T[lang].nobodyT, msg: T[lang].nobodyM, tone: 'bed' })
          return
        }
        setPhase({ k: 'ask', room: String(d.room ?? '') })
      } catch {
        if (!cancelled) setPhase({ k: 'net_error' })
      }
    }
    run()
    return () => {
      cancelled = true
    }
    // Language only styles the copy of whichever branch we land on; re-running
    // the lookup on every toggle would be a pointless extra API call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy || !name.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/public/room/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastName: name.trim() }),
      })
      const d = await res.json()

      if (!d?.ok) {
        if (d?.reason === 'rate_limited') {
          setPhase({ k: 'info', title: t('rateT'), msg: t('rateM'), tone: 'warn' })
          return
        }
        if (d?.reason === 'nobody_here') {
          setPhase({ k: 'info', title: t('nobodyT'), msg: t('nobodyM'), tone: 'bed' })
          return
        }
        if (d?.reason === 'wrong_name') {
          setError(t('wrongM'))
          setBusy(false)
          inputRef.current?.focus()
          return
        }
        setPhase({ k: 'info', title: t('errT'), msg: t('errM'), tone: 'warn' })
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        const { error: authError } = await supabase.auth.signInAnonymously()
        if (authError) {
          setPhase({ k: 'info', title: t('errT'), msg: t('errM'), tone: 'warn' })
          return
        }
      }
      const link = await fetch('/api/reservations/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: d.reservationId }),
      })
      if (!link.ok) {
        setPhase({ k: 'info', title: t('errT'), msg: t('errM'), tone: 'warn' })
        return
      }
      window.location.replace(`/profile/reservations/${encodeURIComponent(d.reservationId)}`)
    } catch {
      setError(null)
      setPhase({ k: 'net_error' })
    }
  }

  function body(): ReactNode {
    if (phase.k === 'loading') return <div className={sco.spin} />
    if (phase.k === 'net_error') {
      return (
        <>
          <Badge tone="warn" />
          <h1>{t('netT')}</h1>
          <p className={sco.msg}>{t('netM')}</p>
        </>
      )
    }
    if (phase.k === 'info') {
      return (
        <>
          <Badge tone={phase.tone} />
          <h1>{phase.title}</h1>
          <p className={sco.msg}>{phase.msg}</p>
        </>
      )
    }
    return (
      <>
        <h1>{t('askT')}</h1>
        {phase.room && <p className={sco.room}>{fmt(t('room'), { room: phase.room })}</p>}
        <p className={sco.msg}>{t('askM')}</p>

        <form onSubmit={submit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="surname">
              {t('label')}
            </label>
            <input
              id="surname"
              ref={inputRef}
              className={`${styles.input} ${error ? styles.inputError : ''}`}
              value={name}
              onChange={e => {
                setName(e.target.value)
                if (error) setError(null)
              }}
              autoComplete="family-name"
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'surname-error' : undefined}
              disabled={busy}
            />
            {error && (
              <p id="surname-error" className={styles.error} role="alert">
                {error}
              </p>
            )}
          </div>

          <button className={sco.go} type="submit" disabled={busy || !name.trim()}>
            {busy ? t('going') : t('go')}
          </button>
        </form>

        <p className={sco.fine}>{t('perks')}</p>
      </>
    )
  }

  return (
    <div className={sco.page}>
      <div className={sco.lang} data-l={lang}>
        <span className={sco.langThumb} />
        <button data-l="de" onClick={() => switchLang('de')}>
          DE
        </button>
        <button data-l="en" onClick={() => switchLang('en')}>
          EN
        </button>
      </div>

      <div className={sco.card}>
        <div className={sco.logo}>{t('logo')}</div>
        <div key={phase.k} className={sco.scoIn}>
          {body()}
        </div>
      </div>
    </div>
  )
}
