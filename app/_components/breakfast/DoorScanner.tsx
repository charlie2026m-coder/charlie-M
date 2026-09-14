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
 *   - the device camera, opened on arrival. Chrome and Android read the code
 *     natively (BarcodeDetector); Safari has no such thing, so there each
 *     frame goes through a small decoder in JavaScript (jsqr) instead. Same
 *     loop, two readers, and the scanner and typing still work regardless.
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

type CameraState = 'off' | 'on' | 'unsupported' | 'denied' | 'nocamera'

type NativeDetector = new (o: { formats: string[] }) => {
  detect(s: CanvasImageSource): Promise<{ rawValue: string }[]>
}

export function DoorScanner({
  backHref,
  backLabel = 'Back',
  autoStart = true,
}: {
  /** Where "back" goes. The admin panel has its own menu and passes nothing. */
  backHref?: string
  backLabel?: string
  /** Open the camera as soon as the screen appears. */
  autoStart?: boolean
}) {
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [last, setLast] = useState<Entry | null>(null)
  const [history, setHistory] = useState<Entry[]>([])
  const [camera, setCamera] = useState<CameraState>('off')

  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera('unsupported')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      setCamera('on')
    } catch (e) {
      const name = e instanceof Error ? e.name : ''
      setCamera(name === 'NotFoundError' || name === 'OverconstrainedError' ? 'nocamera' : 'denied')
    }
  }, [])

  // The <video> exists only while the camera is on, so the stream is attached
  // once it has mounted. Attaching before that hit an empty ref, the picture
  // never appeared, and the button read as doing nothing.
  useEffect(() => {
    if (camera !== 'on') return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return
    video.srcObject = stream
    void video.play().catch(() => {
      // Autoplay refused: the tap on "Open the camera" will do it.
    })
  }, [camera])

  // Opens on arrival: the person at the door came to scan, not to look for a
  // button. A refusal falls back to the input, which the handheld scanner and
  // typing still feed.
  useEffect(() => {
    if (!autoStart) return
    const timer = window.setTimeout(() => void startCamera(), 0)
    return () => window.clearTimeout(timer)
  }, [autoStart, startCamera])

  // Polls a few times a second rather than every frame: a QR held up to a
  // tablet does not move, and decoding at 60fps only heats the device. Chrome
  // and Android read the code natively; Safari has no BarcodeDetector, so
  // there a frame is drawn to a canvas and decoded in JavaScript instead.
  useEffect(() => {
    if (camera !== 'on') return
    let stopped = false
    const Detector = (window as unknown as { BarcodeDetector?: NativeDetector }).BarcodeDetector
    const native = Detector ? new Detector({ formats: ['qr_code'] }) : null
    let decoder: typeof import('jsqr').default | null = null

    const tick = async () => {
      const video = videoRef.current
      if (stopped || !video || video.readyState < 2) return
      try {
        let value: string | undefined
        if (native) {
          const codes = await native.detect(video)
          value = codes[0]?.rawValue?.trim()
        } else {
          if (!decoder) decoder = (await import('jsqr')).default
          const canvas = canvasRef.current
          if (!canvas || stopped) return
          const width = video.videoWidth || 640
          const height = video.videoHeight || 480
          const scale = Math.min(1, 640 / width)
          canvas.width = Math.round(width * scale)
          canvas.height = Math.round(height * scale)
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (!ctx) return
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = decoder(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })
          value = code?.data?.trim()
        }
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

      <div className='mt-3 flex flex-wrap items-center gap-3'>
        <Button
          type='button'
          variant={camera === 'on' ? 'outline' : 'default'}
          onClick={() => (camera === 'on' ? stopCamera() : void startCamera())}
          className='h-11 px-5 text-base'
        >
          {camera === 'on' ? <MdVideocamOff /> : <MdPhotoCamera />}
          {camera === 'on' ? 'Camera off' : 'Open the camera'}
        </Button>
        {camera === 'unsupported' && (
          <span className='text-sm text-gray-600'>
            This browser cannot use the camera. Use a handheld scanner, or type the code.
          </span>
        )}
        {camera === 'nocamera' && (
          <span className='text-sm text-gray-600'>
            No camera on this device. Use a handheld scanner, or type the code.
          </span>
        )}
        {camera === 'denied' && (
          <span className='text-sm text-gray-600'>
            Camera permission was refused — allow it in the browser settings, or type the code.
          </span>
        )}
      </div>

      {camera === 'on' && (
        <div className='relative mt-3'>
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            className='aspect-[4/3] w-full rounded-xl border border-gray-300 bg-black object-cover sm:aspect-video'
          />
          {/* Off-screen frame buffer for the JavaScript decoder. */}
          <canvas ref={canvasRef} className='hidden' />
          <p className='pointer-events-none absolute inset-x-0 bottom-2 text-center text-sm text-white drop-shadow'>
            Hold the guest’s QR in front of the camera
          </p>
        </div>
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
