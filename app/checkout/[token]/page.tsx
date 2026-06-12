'use client'

/**
 * Guest-facing QR self-checkout page — 1:1 React port of the approved design
 * (checkout-design.html). The state machine, branch order and texts mirror
 * the design exactly; only the rendering is React instead of innerHTML.
 *
 * API contract (same as HotelCheck):
 *   GET  /api/public/self-checkout/{token}              → current state
 *   POST /api/public/self-checkout/{token}?early_ack=1  → confirm checkout
 */

import { Fragment, useCallback, useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import styles from './page.module.css'
import { T, fmt, niceDate, type Lang, type TKey } from './translations'

interface ApiData {
  ok?: boolean
  state?: string
  demo?: boolean
  room?: string
  guest?: string
  balance?: number
  currency?: string
  reason?: string
  departure?: string
  days_until?: number
  early?: boolean
  wait_seconds?: number
}

type ViewData = ApiData | 'loading' | 'net_error'

/** fmt() for templates whose placeholder must render as markup (e.g. {amount}). */
function fmtNode(tpl: string, values: Record<string, ReactNode>): ReactNode {
  return tpl.split(/(\{\w+\})/g).map((part, i) => {
    const m = part.match(/^\{(\w+)\}$/)
    if (!m) return <Fragment key={i}>{part}</Fragment>
    return <Fragment key={i}>{values[m[1]] ?? ''}</Fragment>
  })
}

// ── Icons (verbatim from the design) ─────────────────────────────────────────

function IconCheck() {
  return (
    <span className={`${styles.badge} ${styles.green} ${styles.pop}`}>
      <svg viewBox="0 0 52 52" fill="none" stroke="#A09060" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path className={styles.draw} d="M14 27l8 8 16-17" />
      </svg>
    </span>
  )
}

function IconBed() {
  return (
    <span className={`${styles.badge} ${styles.blue}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="#8B7B70" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 18v-6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6" />
        <path d="M2 18h20" />
        <path d="M6 10V8a2 2 0 0 1 2-2h3v4" />
      </svg>
    </span>
  )
}

function IconReceipt() {
  return (
    <span className={`${styles.badge} ${styles.amber}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="#8B7B70" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3v18l2-1 2 1 2-1 2 1 2-1 2 1V3l-2 1-2-1-2 1-2-1-2 1-2-1z" />
        <path d="M9 8h6M9 12h6" />
      </svg>
    </span>
  )
}

function IconWarn() {
  return (
    <span className={`${styles.badge} ${styles.red}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="#923D4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4M12 17h.01M10.3 3.9l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0z" />
      </svg>
    </span>
  )
}

function IconChat() {
  return (
    <span className={`${styles.badge} ${styles.blue}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="#8B7B70" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 20l1.3-3.9A8.38 8.38 0 0 1 3.5 11 8.5 8.5 0 0 1 12 3a8.38 8.38 0 0 1 9 8.5z" />
        <path d="M9 11h.01M12 11h.01M15 11h.01" />
      </svg>
    </span>
  )
}

const ICONS = {
  check: IconCheck,
  bed: IconBed,
  receipt: IconReceipt,
  warn: IconWarn,
  chat: IconChat,
} as const

function Info({ icon, title, msg }: { icon: keyof typeof ICONS; title: string; msg: ReactNode }) {
  const Icon = ICONS[icon]
  return (
    <>
      <Icon />
      <h1>{title}</h1>
      <p className={styles.msg}>{msg}</p>
    </>
  )
}

// ── Early-checkout confirmation overlay ──────────────────────────────────────

function EarlyConfirmOverlay({
  data,
  lang,
  onConfirm,
  onCancel,
}: {
  data: ApiData
  lang: Lang
  onConfirm: () => void
  onCancel: () => void
}) {
  const t = (k: TKey) => T[lang][k] ?? T.de[k]
  const wait = Math.max(0, Math.floor(data.wait_seconds ?? 3))
  const [n, setN] = useState(wait)

  useEffect(() => {
    if (wait <= 0) return
    const timer = setInterval(() => {
      setN((v) => (v <= 1 ? 0 : v - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [wait])

  return (
    <div
      className={styles.ov}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className={`${styles.dlg} ${styles.pop}`}>
        <IconWarn />
        <h1>{t('earlyT')}</h1>
        <p className={styles.msg}>
          {fmtNode(t('earlyM'), {
            date: <span className={styles.amount}>{niceDate(data.departure ?? '', lang)}</span>,
          })}
        </p>
        <button
          className={styles.go}
          disabled={n > 0}
          onClick={() => {
            if (n <= 0) onConfirm()
          }}
        >
          {n > 0 ? fmt(t('earlyWait'), { n }) : t('earlyGo')}
        </button>
        <button className={styles.ghost} onClick={onCancel}>
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SelfCheckoutPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token ?? ''

  const [lang, setLang] = useState<Lang>('de')
  const [data, setData] = useState<ViewData>('loading')
  const [overlay, setOverlay] = useState<ApiData | null>(null)
  const [going, setGoing] = useState(false)

  const t = useCallback((k: TKey): string => T[lang][k] ?? T.de[k], [lang])

  // Language: stored preference, else browser language. Must run after mount
  // (localStorage is client-only) — SSR renders 'de', then the real choice is
  // applied; this avoids a hydration mismatch. One-time external-system sync,
  // hence the rule exception.
  useEffect(() => {
    const stored = localStorage.getItem('sco_lang') || navigator.language || 'de'
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(stored.slice(0, 2).toLowerCase() === 'en' ? 'en' : 'de')
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const handleResponse = useCallback((d: ApiData) => {
    if (d && d.state === 'needs_confirm') {
      // Server-side early guard fired: keep the current card, open the popup.
      setOverlay(d)
      setGoing(false)
      return
    }
    setOverlay(null)
    setGoing(false)
    setData(d)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(`/api/public/self-checkout/${encodeURIComponent(token)}`)
        const d = await r.json()
        if (!cancelled) handleResponse(d)
      } catch {
        if (!cancelled) setData('net_error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, handleResponse])

  const doConfirm = useCallback(
    async (ack: boolean) => {
      setGoing(true)
      try {
        const url = `/api/public/self-checkout/${encodeURIComponent(token)}${ack ? '?early_ack=1' : ''}`
        const r = await fetch(url, { method: 'POST' })
        handleResponse(await r.json())
      } catch {
        setGoing(false)
        setData('net_error')
      }
    },
    [token, handleResponse]
  )

  const switchLang = (l: Lang) => {
    setLang(l)
    localStorage.setItem('sco_lang', l)
  }

  const balanceMsg = (d: ApiData): ReactNode =>
    fmtNode(t('balM'), {
      amount: (
        <span className={styles.amount}>
          {`${d.balance != null ? d.balance : ''} ${d.currency || 'EUR'}`}
        </span>
      ),
    })

  // The render switch — same branch order as the design's show(d).
  function renderBody(): ReactNode {
    if (data === 'loading') return <div className={styles.spin} />
    if (data === 'net_error') return <Info icon="warn" title={t('netT')} msg={t('netM')} />
    const d = data
    if (!d.ok) {
      if (d.state === 'invalid') return <Info icon="warn" title={t('invT')} msg={t('invM')} />
      if (d.state === 'no_departure') return <Info icon="bed" title={t('noDepT')} msg={t('noDepM')} />
      if (d.state === 'blocked') {
        if (d.reason === 'balance_direct')
          return <Info icon="receipt" title={t('balT')} msg={balanceMsg(d)} />
        return <Info icon="chat" title={t('blockT')} msg={t('blockM')} />
      }
      return <Info icon="warn" title={t('errT')} msg={t('errM')} />
    }
    if (d.state === 'no_departure') return <Info icon="bed" title={t('noDepT')} msg={t('noDepM')} />
    if (d.state === 'blocked') {
      if (d.reason === 'balance_direct')
        return <Info icon="receipt" title={t('balT')} msg={balanceMsg(d)} />
      return <Info icon="chat" title={t('blockT')} msg={t('blockM')} />
    }
    if (d.state === 'done') return <Info icon="check" title={t('doneT')} msg={t('doneM')} />
    if (d.state === 'ready') {
      const sub =
        (d.days_until ?? 0) > 0
          ? fmt(t('depOn'), { date: niceDate(d.departure ?? '', lang) })
          : t('depToday')
      return (
        <>
          <h1>{t('greet')}</h1>
          <p className={styles.room}>{sub}</p>
          <p className={styles.msg}>{t('readyMsg')}</p>
          <button
            className={styles.go}
            disabled={going}
            onClick={() => (d.early ? setOverlay(d) : doConfirm(false))}
          >
            {going ? t('going') : t('go')}
          </button>
          <p className={styles.fine}>{d.early ? t('fineEarly') : t('fine')}</p>
        </>
      )
    }
    return <Info icon="warn" title={t('errT')} msg={t('errM')} />
  }

  const bodyKey = typeof data === 'string' ? data : data.state || 'unknown'
  const isDemo = typeof data === 'object' && !!data.demo

  return (
    <div className={styles.page}>
      {isDemo && <div className={styles.demoFlag}>{t('demo')}</div>}

      <div className={styles.lang} data-l={lang}>
        <span className={styles.langThumb} />
        <button data-l="de" onClick={() => switchLang('de')}>
          DE
        </button>
        <button data-l="en" onClick={() => switchLang('en')}>
          EN
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.logo}>{t('logo')}</div>
        <div key={bodyKey} className={styles.scoIn}>
          {renderBody()}
        </div>
      </div>

      {overlay && (
        <EarlyConfirmOverlay
          data={overlay}
          lang={lang}
          onConfirm={() => {
            setOverlay(null)
            doConfirm(true)
          }}
          onCancel={() => setOverlay(null)}
        />
      )}
    </div>
  )
}
