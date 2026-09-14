'use client'

/**
 * The dining-room door. Shared by the admin panel and the kitchen's own
 * screens — same scanner, different way back.
 *
 * One job, done in under a second while somebody stands in front of you: read
 * the guest's QR, say yes or no, and show which breakfast they get. Everything
 * else on this screen is subordinate to that, which is why the answer is a
 * full-width colour block readable at arm's length rather than a row in a table.
 *
 * Two ways in, because the door is not a desk:
 *   - a keyboard-wedge scanner (USB or Bluetooth) types the token and presses
 *     Enter; the input is kept focused so that just works, with no camera
 *     permission, no library and no browser support question;
 *   - the tablet camera, via the browser's own BarcodeDetector where it exists.
 *     It is progressive enhancement on purpose: Safari has no BarcodeDetector,
 *     so on an iPad the button says so instead of failing silently, and the
 *     scanner and typing still work.
 *
 * The QR encodes the guest page's URL (so a guest's own camera opens their
 * choices); the API takes the token back out of it, and refuses any other URL.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { MdArrowBack, MdPhotoCamera, MdVideocamOff } from 'react-icons/md'
import { Button } from '@/app/_components/ui/button'
import { MenuIcon } from '@/app/_components/breakfast/MenuIcon'

interface ScanResponse {
  ok: boolean
  result: 'ok' | 'already' | 'no_booking' | 'not_paid' | 'unknown_token' | 'error'
  guest?: string
  room?: string
  menus?: { code: string; name: string; icon: string; persons: number }[]
  slot?: { startsAt: string; endsAt: string } | null
  persons?: number
  attendedAt?: string | null
  note?: string
}

interface Entry extends ScanResponse {
  at: number
  token: string
}

/** What the door needs to know, in the words staff would use. */
const VERDICT: Record<ScanResponse['result'], { tone: string; title: string; blurb: string }> = {
  ok: {
    tone: 'bg-green-50 border-green-600 text-green-900',
    title: 'Let them in',
    blurb: 'Breakfast is paid for this morning. Counted.',
  },
  already: {
    tone: 'bg-amber-50 border-amber-500 text-amber-900',
    title: 'Already checked in',
    blurb: 'This code was scanned earlier today. Not counted twice.',
  },
  no_booking: {
    tone: 'bg-amber-50 border-amber-500 text-amber-900',
    title: 'Let them in — no menu chosen',
    blurb: 'Breakfast is paid for, but they never picked a menu. Serve whatever is on today.',
  },
  not_paid: {
    tone: 'bg-red-50 border-red-600 text-red-900',
    title: 'No breakfast today',
    blurb: 'This reservation has no breakfast for this morning. They can buy it at reception.',
  },
  unknown_token: {
    tone: 'bg-red-50 border-red-600 text-red-900',
    title: 'Code not recognised',
    blurb: 'Not one of our breakfast codes. Check they are showing the breakfast QR.',
  },
  error: {
    tone: 'bg-red-50 border-red-600 text-red-900',
    title: 'Something went wrong',
    blurb: 'Try once more. If it keeps failing, take the room number and let them in.',
  },
}

const hhmm = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  }).format(new Date(iso))

export function DoorScanner({
  backHref,
  backLabel = 'Back',
}: {
  /** Where "back" goes. The admin panel has its own menu and passes nothing. */
  backHref?: string
  backLabel?: string
}) {
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [last, setLast] = useState<Entry | null>(null)
  const [history, setHistory] = useState<Entry[]>([])
  const [camera, setCamera] = useState<'off' | 'on' | 'unsupported' | 'denied'>('off')

  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // The camera sees the same code thirty times a second. Without this the
  // second frame re-scans a token the first one already counted.
  const recentRef = useRef<{ token: string; at: number } | null>(null)

  const submit = useCallback(async (raw: string) => {
    const value = raw.trim()
    if (!value || busy) return

    const recent = recentRef.current
    if (recent && recent.token === value && Date.now() - recent.at < 4000) return
    recentRef.current = { token: value, at: Date.now() }

    setBusy(true)
    try {
      const res = await fetch('/api/admin/breakfast/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: value, locale: 'en' }),
      })
      const json: ScanResponse = res.ok
        ? await res.json()
        : { ok: false, result: res.status === 401 || res.status === 403 ? 'error' : 'error' }
      const entry: Entry = { ...json, at: Date.now(), token: value }
      setLast(entry)
      setHistory(h => [entry, ...h].slice(0, 8))
    } catch {
      setLast({ ok: false, result: 'error', at: Date.now(), token: value })
    } finally {
      setBusy(false)
      setToken('')
      inputRef.current?.focus()
    }
  }, [busy])

  // Keep the wedge scanner's keystrokes landing somewhere: it types wherever
  // the focus happens to be, so anything that steals focus breaks the door.
  useEffect(() => {
    const keep = () => {
      if (document.activeElement?.tagName !== 'INPUT') inputRef.current?.focus()
    }
    const id = window.setInterval(keep, 1500)
    inputRef.current?.focus()
    return () => window.clearInterval(id)
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCamera('off')
  }, [])

  const startCamera = useCallback(async () => {
    const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect(s: CanvasImageSource): Promise<{ rawValue: string }[]> } }).BarcodeDetector
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setCamera('unsupported')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCamera('on')
    } catch {
      setCamera('denied')
    }
  }, [])

  // Polls a few times a second rather than every frame: a QR held up to a
  // tablet does not move, and decoding at 60fps only heats the device.
  useEffect(() => {
    if (camera !== 'on') return
    const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect(s: CanvasImageSource): Promise<{ rawValue: string }[]> } }).BarcodeDetector
    if (!Detector) return
    const detector = new Detector({ formats: ['qr_code'] })
    let stopped = false

    const tick = async () => {
      const video = videoRef.current
      if (stopped || !video || video.readyState < 2) return
      try {
        const codes = await detector.detect(video)
        const value = codes[0]?.rawValue?.trim()
        if (value) void submit(value)
      } catch {
        // A frame that will not decode is the normal case, not an error.
      }
    }

    const id = window.setInterval(tick, 300)
    return () => {
      stopped = true
      window.clearInterval(id)
    }
  }, [camera, submit])

  useEffect(() => () => stopCamera(), [stopCamera])

  const verdict = last ? VERDICT[last.result] ?? VERDICT.error : null

  return (
    <main className='mx-auto w-full max-w-[760px] p-4 pb-16 sm:p-6'>
      <div className='mb-4 flex items-center gap-3'>
        {backHref && (
          <Button asChild variant='outline' size='sm' className='h-8'>
            <Link href={backHref}>
              <MdArrowBack /> {backLabel}
            </Link>
          </Button>
        )}
        <h1 className='text-xl font-bold text-black'>Breakfast door</h1>
      </div>

      <form
        onSubmit={e => {
          e.preventDefault()
          void submit(token)
        }}
        className='flex gap-2'
      >
        <input
          ref={inputRef}
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder='Scan the guest’s QR, or type the code'
          autoComplete='off'
          autoCapitalize='off'
          spellCheck={false}
          className='h-12 min-w-0 flex-1 rounded-xl border border-gray-300 px-4 text-base outline-none focus:border-black'
        />
        <Button type='submit' disabled={busy || !token.trim()} className='h-12 px-6'>
          {busy ? 'Checking…' : 'Check'}
        </Button>
      </form>

      <div className='mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500'>
        <button
          type='button'
          onClick={() => (camera === 'on' ? stopCamera() : void startCamera())}
          className='inline-flex items-center gap-1.5 underline underline-offset-2'
        >
          {camera === 'on' ? <MdVideocamOff /> : <MdPhotoCamera />}
          {camera === 'on' ? 'Turn the camera off' : 'Use the camera'}
        </button>
        {camera === 'unsupported' && (
          <span>
            This browser cannot read QR codes from the camera (Safari does not support it). Use a
            handheld scanner, or type the code.
          </span>
        )}
        {camera === 'denied' && <span>Camera permission was refused.</span>}
      </div>

      {/* Kept mounted while the camera is on so the video element the detector
          reads from never has to be re-created mid-service. */}
      {camera === 'on' && (
        <video
          ref={videoRef}
          muted
          playsInline
          className='mt-3 aspect-video w-full rounded-xl border border-gray-300 bg-black object-cover'
        />
      )}

      {verdict && last && (
        <section className={`mt-5 rounded-2xl border-2 p-5 ${verdict.tone}`}>
          <h2 className='text-2xl font-bold'>{verdict.title}</h2>
          <p className='mt-1 text-sm opacity-90'>{verdict.blurb}</p>

          {(last.guest || last.room) && (
            <p className='mt-4 text-lg font-medium'>
              {last.guest || 'Guest'}
              {last.room ? ` · room ${last.room}` : ''}
              {last.persons ? ` · ${last.persons} ${last.persons === 1 ? 'person' : 'people'}` : ''}
            </p>
          )}

          {last.menus && last.menus.length > 0 && (
            <ul className='mt-3 flex flex-wrap gap-2'>
              {last.menus.map(m => (
                <li
                  key={m.code}
                  className='inline-flex items-center gap-2 rounded-full border border-current/30 bg-white/60 px-3 py-1.5 text-base font-medium'
                >
                  <MenuIcon name={m.icon} className='h-4 w-4 shrink-0' />
                  {m.persons}× {m.name}
                </li>
              ))}
            </ul>
          )}

          {last.slot && (
            <p className='mt-3 text-sm'>
              Sitting {last.slot.startsAt}–{last.slot.endsAt}
            </p>
          )}

          {last.note && (
            <p className='mt-3 rounded-xl border border-current/30 bg-white/60 px-3 py-2 text-base'>
              <span className='mr-1 font-semibold'>Note:</span>
              {last.note}
            </p>
          )}

          {last.result === 'already' && last.attendedAt && (
            <p className='mt-3 text-sm'>First scanned at {hhmm(last.attendedAt)}.</p>
          )}
        </section>
      )}

      {history.length > 1 && (
        <section className='mt-8'>
          <h2 className='mb-2 text-xs font-medium uppercase tracking-[0.14em] text-gray-500'>
            Last scans
          </h2>
          <ul className='divide-y rounded-xl border border-gray-200'>
            {history.slice(1).map(entry => (
              <li
                key={`${entry.token}-${entry.at}`}
                className='flex items-center justify-between gap-3 px-3 py-2 text-sm'
              >
                <span className='min-w-0 truncate'>
                  {entry.guest || entry.token.slice(0, 8)}
                  {entry.room ? ` · ${entry.room}` : ''}
                </span>
                <span className='shrink-0 text-gray-500'>
                  {VERDICT[entry.result]?.title ?? entry.result} · {hhmm(new Date(entry.at).toISOString())}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
