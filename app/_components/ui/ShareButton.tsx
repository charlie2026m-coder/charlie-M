'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { FiShare2, FiCheck } from 'react-icons/fi'

/**
 * "Share this room" — the affordance the OTAs put on every listing card.
 *
 * Two behaviours, picked at click time:
 *  - phones/tablets: the native share sheet (WhatsApp, Messages, Mail, …) via
 *    the Web Share API. This is the case that matters — people plan trips by
 *    sending each other links, and today the only way to do that here is to
 *    copy the address bar, which nobody does on a phone.
 *  - desktop / no Web Share: copy the link and say so, since a share sheet
 *    doesn't exist there.
 *
 * The URL carries the guest's dates and party size, so whoever opens it sees
 * the same price rather than an empty search.
 *
 * Labels are inline rather than in the message files on purpose: those are
 * keyed by array index in places, and a missing key renders the key PATH onto
 * the live page. Two words don't justify that risk.
 */

const LABELS = {
  de: { share: 'Teilen', copied: 'Link kopiert', failed: 'Kopieren nicht möglich' },
  en: { share: 'Share', copied: 'Link copied', failed: "Couldn't copy" },
} as const

export default function ShareButton({
  url,
  title,
  showLabel = false,
  className = '',
}: {
  /** Absolute or app-relative URL. Omit to share the page currently open —
   *  which is what a detail page wants, query string and all. */
  url?: string
  /** Room name — becomes the share sheet's title. */
  title: string
  /** Show the word next to the icon. Off where space is tight. */
  showLabel?: boolean
  className?: string
}) {
  const locale = useLocale()
  const t = LABELS[locale === 'de' ? 'de' : 'en']
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const flash = (next: 'copied' | 'failed') => {
    setState(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 2000)
  }

  const onShare = useCallback(
    async (e: React.MouseEvent) => {
      // The card is wrapped in links; a share click must not navigate.
      e.preventDefault()
      e.stopPropagation()

      const absolute = !url
        ? window.location.href
        : url.startsWith('http')
          ? url
          : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({ title, url: absolute })
          return
        } catch (err) {
          // The user dismissing the sheet throws AbortError — that is not a
          // failure and must not turn into an error message or a clipboard
          // write they didn't ask for.
          if (err instanceof Error && err.name === 'AbortError') return
          // Anything else (permission policy, unsupported target) falls through
          // to copying, which always works.
        }
      }

      try {
        await navigator.clipboard.writeText(absolute)
        flash('copied')
      } catch {
        flash('failed')
      }
    },
    [url, title],
  )

  const label = state === 'copied' ? t.copied : state === 'failed' ? t.failed : t.share

  return (
    <button
      type='button'
      onClick={onShare}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white text-[13px] font-medium text-dark transition-colors hover:border-gray-300 hover:bg-gray-50 active:scale-[0.97] ${
        showLabel ? 'size-10 sm:size-auto sm:px-3.5 sm:py-2' : 'px-3 py-2'
      } ${className}`}
    >
      {state === 'copied' ? (
        <FiCheck className='size-4 text-green' aria-hidden />
      ) : (
        <FiShare2 className='size-4' aria-hidden />
      )}
      {/* Where space is tight the word is only for screen readers and the
          tooltip; after a copy it always appears, so the click has visible
          feedback either way. */}
      {/* Phone: icon only — a labelled pill next to a three-line room title
          eats a whole row. From sm the word appears. After a copy the label is
          always shown, on any width, so the click has visible feedback. */}
      <span
        className={
          state !== 'idle'
            ? ''
            : showLabel
              ? 'hidden sm:inline'
              : 'sr-only'
        }
      >
        {label}
      </span>
    </button>
  )
}
