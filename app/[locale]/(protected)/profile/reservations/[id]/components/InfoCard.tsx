'use client'
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import CardContent from './CardContent'
import { useTranslations } from 'next-intl'

// useLayoutEffect on the client, useEffect on the server (avoids the SSR warning).
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const INFO_CARD_IMAGES: Record<number, string[]> = {
  1: ['/images/exp-1.webp'],
  2: ['/images/profile/luggage.webp'],
  3: ['/images/profile/self-service.webp'],
  4: ['/images/profile/laundry.webp'],
  5: ['/images/profile/coffee-machine.webp'],
  6: ['/images/wifi-image.webp'],
  7: ['/images/profile/lost.webp'],
  8: ['/images/profile/room-refresh.webp'],
  9: ['/images/profile/garbage.webp'],
}

const maskStyle = (src: string) => ({
  WebkitMaskImage: `url(${src})`,
  maskImage: `url(${src})`,
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
})

// Compact photo tile (style B). On hover/tap the tile GROWS IN PLACE: a larger
// card unfolds from the tile's own position (not a centered modal) and shows the
// full details. One open at a time (controlled by the parent).
const InfoCard = ({
  card,
  featured = false,
  open = false,
  onShow,
  onScheduleClose,
  onClose,
}: {
  card: { id: number; title: string; image: string }
  featured?: boolean
  open?: boolean
  onShow?: () => void
  onScheduleClose?: () => void
  onClose?: () => void
}) => {
  const t = useTranslations('profile')
  const { id, title, image } = card

  // Hover-to-open is a pointer-device pattern. On touch the emulated mouse
  // events wreck it: mouseenter fires mid-tap (double open / swallowed ✕ taps)
  // and mouseleave never comes, so nothing closes. Without hover: tap opens,
  // ✕ or tapping the backdrop closes, and no mouse handlers are wired at all.
  const [canHover] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(hover: hover)').matches,
  )

  const images = INFO_CARD_IMAGES[id] || []
  const hasPhoto = images.length > 0

  const allContent = t.raw(`infoContent.${id}`) as Record<string, unknown> | undefined
  const description = Array.isArray(allContent?.description) ? (allContent.description as string[]) : []
  const card1 = Array.isArray(allContent?.card1) ? (allContent.card1 as string[]) : undefined
  const card2 = Array.isArray(allContent?.card2) ? (allContent.card2 as string[]) : undefined
  const subtitle = t(`informationSubtitles.${id}`)

  const tileRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // Position the grown card over its tile, then FLIP so it visibly grows OUT OF
  // the tile (origin = the tile), staying anchored to it rather than centering.
  useIsoLayoutEffect(() => {
    if (!open) return
    const tile = tileRef.current
    const popup = popupRef.current
    if (!tile || !popup) return

    // Touch: a free-floating card sized against window.innerHeight keeps losing
    // to iOS viewport games (URL bar collapse/expand moved its top off screen —
    // with the ✕ on it). A bottom sheet can't: anchored to the visible bottom,
    // capped at 85dvh, its top edge — and the ✕ — is always on screen.
    if (!canHover) {
      popup.style.left = '0px'
      popup.style.right = '0px'
      popup.style.top = 'auto'
      popup.style.bottom = '0px'
      popup.style.width = '100%'
      popup.style.maxHeight = '85dvh'
      popup.animate(
        [{ transform: 'translateY(100%)' }, { transform: 'none' }],
        { duration: 300, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'both' },
      )
      return
    }

    const tr = tile.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const m = 12

    // Grown size: a bit wider than the tile, tall enough for the content.
    const W = Math.min(vw - m * 2, Math.max(360, Math.round(tr.width * 1.5)))
    popup.style.width = `${W}px`
    popup.style.maxHeight = `${vh - m * 2}px`
    const H = Math.min(popup.offsetHeight, vh - m * 2)

    // Centre horizontally on the tile, anchor near the tile's top, clamp to view.
    const left = Math.max(m, Math.min(tr.left + tr.width / 2 - W / 2, vw - W - m))
    const top = Math.max(m, Math.min(tr.top, vh - H - m))
    popup.style.left = `${left}px`
    popup.style.top = `${top}px`

    // FLIP from the tile rect via the Web Animations API. The classic
    // set-start → force-reflow → set-end transition recipe silently never fired
    // here (the popup stayed stuck at the scaled-down start frame), so the
    // grow animation is driven by animate(), which cannot miss.
    const dx = tr.left - left
    const dy = tr.top - top
    const sx = tr.width / W
    const sy = tr.height / H
    popup.style.transformOrigin = 'top left'
    popup.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.25 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 280, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'both' },
    )
  }, [open, canHover])

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onShow?.()
    }
  }

  // Touch: freeze the page behind the popup. Without this the body scrolls
  // underneath (scroll chaining), the sticky header drifts over the card and
  // the whole thing feels broken. Desktop keeps background scroll (hover-flow).
  useEffect(() => {
    if (!open || canHover) return
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = prev
    }
  }, [open, canHover])

  return (
    <>
      <div
        ref={tileRef}
        role='button'
        tabIndex={0}
        aria-expanded={open}
        onClick={onShow}
        onKeyDown={onKey}
        onMouseEnter={canHover ? onShow : undefined}
        onMouseLeave={canHover ? onScheduleClose : undefined}
        className={`group relative aspect-[4/3] w-full overflow-hidden rounded-2xl cursor-pointer transition-opacity duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-dark-gold ${
          featured ? 'ring-2 ring-dark-gold' : ''
        } ${open ? 'opacity-0' : 'opacity-100'}`}
      >
        {hasPhoto ? (
          <>
            <Image
              src={images[0]}
              alt={title}
              fill
              sizes='(max-width: 1024px) 50vw, 33vw'
              className='object-cover object-center transition-transform duration-500 group-hover:scale-105'
            />
            <div className='absolute top-3 left-3 flex items-center justify-center size-9 rounded-full bg-white/90 backdrop-blur-sm'>
              <span aria-hidden='true' className='size-5 bg-dark-gold' style={maskStyle(image)} />
            </div>
          </>
        ) : (
          <div className='absolute inset-0 bg-dark-gold flex items-center justify-center'>
            <span aria-hidden='true' className='size-12 bg-white' style={maskStyle(image)} />
          </div>
        )}
        <div className='absolute inset-x-0 bottom-0 bg-black/45 px-3 py-2.5'>
          <h3 className='text-white font-semibold text-sm md:text-[15px] leading-tight'>{title}</h3>
          <p className='text-white/85 text-[11px] md:text-xs leading-snug mt-0.5 line-clamp-1'>{subtitle}</p>
        </div>
      </div>

      {open && (
        // Wrapper hosts a faint dim and is pointer-events-none so the tiles
        // underneath keep their hover (so the hover-to-open logic doesn't flicker).
        // On touch there is no hover to preserve — the dim layer becomes the
        // tap-outside close target instead.
        // z-[120]: must clear the fixed StickyHeader (z-50), which otherwise
        // sits on top of the card's upper strip — hiding the ✕ on phones.
        <div className='fixed inset-0 z-[120] pointer-events-none'>
          <div
            className={`absolute inset-0 bg-black/30 animate-in fade-in-0 duration-200 ${canHover ? '' : 'pointer-events-auto'}`}
            onClick={canHover ? undefined : onClose}
          />
          <div
            ref={popupRef}
            role='dialog'
            aria-modal='false'
            aria-label={card.title}
            onMouseEnter={canHover ? onShow : undefined}
            onMouseLeave={canHover ? onScheduleClose : undefined}
            style={{ left: 0, top: 0, willChange: 'transform, opacity', backfaceVisibility: 'hidden' }}
            className={`pointer-events-auto fixed flex flex-col overflow-hidden bg-white shadow-lg ${canHover ? 'rounded-2xl' : 'rounded-t-2xl'}`}
          >
            {/* ✕ is anchored to the CARD, not the scrollable content — before,
                scrolling the popup carried the button away and there was no way
                left to close on a phone. */}
            <button
              type='button'
              onClick={onClose}
              aria-label='Close'
              className='absolute top-3 right-3 z-20 flex items-center justify-center size-9 rounded-full bg-white/90 shadow-sm text-dark hover:bg-white transition-colors cursor-pointer focus:outline-none'
            >
              <X className='size-5' />
            </button>
            <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 md:px-7 pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+24px)]'>
              <CardContent
                images={images}
                description={description}
                card1={card1}
                card2={card2}
                id={id}
                image={image}
                title={card.title}
                subtitle={subtitle}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default InfoCard
