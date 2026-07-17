'use client'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/_components/ui/dialog'
import { useLayoutEffect, useRef, useState } from 'react'
import CardContent from './CardContent'
import { useTranslations } from 'next-intl'

// Images for each information card
const INFO_CARD_IMAGES: Record<number, string[]> = {
  1: ['/images/exp-1.webp'],
  2: ['/images/profile/luggage.webp'],
  3: ['/images/profile/self-service.webp'],
  4: ['/images/profile/laundry.webp'],
  5: ['/images/profile/coffee-machine.webp'],
  6: ['/images/wifi-image.webp'],
  7: ['/images/profile/lost.webp'],
  8: ['/images/profile/room-refresh.webp'],
  9: ['/images/profile/garbage.webp']
}

const InfoCard = ({ card }: { card: { id: number, title: string, image: string }}) => {
  const t = useTranslations('profile')
  const [open,setOpen] = useState(false)
  const { id, title, image } = card

  // Hover is a pointer-device trait. Tap-to-open stays on every device; this
  // only picks the OPEN CHOREOGRAPHY. A free-floating card sized against the
  // viewport keeps losing to iOS URL-bar games (collapse/expand shove its top
  // — and the ✕ — off screen), so touch gets a bottom sheet anchored to the
  // visible bottom edge instead, while pointer devices get the grow-from-tile.
  const [canHover] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(hover: hover)').matches,
  )

  const tileRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Get images for this card
  const images = INFO_CARD_IMAGES[id] || []

  // Get translated content with safe key checking
  const getTranslatedContent = () => {
    const contentKey = `infoContent.${id}`

    // Get all content for this card
    const allContent = t.raw(contentKey) as any

    // Safely extract each field
    const description = Array.isArray(allContent?.description) ? allContent.description : []
    const card1 = Array.isArray(allContent?.card1) ? allContent.card1 : undefined
    const card2 = Array.isArray(allContent?.card2) ? allContent.card2 : undefined

    return {
      description,
      card1,
      card2
    }
  }

  const content = getTranslatedContent()

  // Drive the open animation with the Web Animations API. The classic
  // set-start → force-reflow → set-end CSS-transition recipe silently never
  // fired for this popup in the source hotel, so animate() — which cannot miss
  // — runs it. Radix's own zoom/fade enter is switched off first so it neither
  // fights our animation nor pollutes the rect we measure. Side effect: no
  // close animation (Radix has nothing to wait on), matching the source.
  useLayoutEffect(() => {
    if (!open) return
    const el = contentRef.current
    if (!el) return

    el.style.animation = 'none'
    el.style.willChange = 'transform, opacity'

    if (!canHover) {
      // Touch: slide the bottom sheet up from the bottom edge. Its resting
      // transform is none (translate-x/y-0 below), so a plain replace is fine.
      el.animate(
        [{ transform: 'translateY(100%)' }, { transform: 'none' }],
        { duration: 300, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'both' },
      )
      el.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 200, easing: 'ease-out', fill: 'both' },
      )
      return
    }

    // Pointer devices: FLIP "grow" out of the tile the guest clicked.
    // composite:'add' layers the grow ON TOP of Radix's centring transform, so
    // we never overwrite (nor have to recompute) the translate(-50%,-50%) that
    // keeps the dialog centred — at rest the added transform is identity.
    const tile = tileRef.current
    if (!tile) return
    const from = tile.getBoundingClientRect()
    const to = el.getBoundingClientRect()
    if (to.width === 0 || to.height === 0) return
    el.style.transformOrigin = 'top left'
    el.animate(
      [
        {
          transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`,
        },
        { transform: 'none' },
      ],
      { duration: 280, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'both', composite: 'add' },
    )
    el.animate(
      [{ opacity: 0.25 }, { opacity: 1 }],
      { duration: 160, easing: 'ease-out', fill: 'both' },
    )
  }, [open, canHover])

  return (
    <>
      <div
        ref={tileRef}
        onClick={() => setOpen(!open)}
        className='flex flex-col items-center py-8 border border-light1 rounded-2xl group hover:bg-blue hover:text-white cursor-pointer px-2 transition-all duration-500'
      >
        <div className='size-[50px] min-w-[50px] mb-3 group-hover:bg-white rounded-full bg-blue flex items-center self-center justify-center transition-all duration-500'>
          <Image src={image} className='object-cover size-6' width={25} alt='concept-image' height={25}/>
        </div>
        <h4 className='font-semibold text-center'>{title}</h4>
      </div>
      {/* The dialog frame must NOT scroll itself: shadcn's ✕ is absolutely
          positioned inside DialogContent, so with overflow-y-auto on it the
          button scrolled away with the content and phones were left with no
          way to close. Scroll lives on an inner div; ✕ stays pinned. 85dvh
          (not 90vh): static vh ignores the iOS URL bar and clipped the bottom.
          On touch the frame becomes a bottom sheet anchored to the visible
          bottom edge, so its top — and the ✕ — can't be pushed off screen. */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          ref={contentRef}
          className={`flex flex-col overflow-hidden p-0 ${
            canHover
              ? 'rounded-lg w-[95%] md:w-4/5 max-w-[900px] max-h-[85dvh] top-[5%] md:top-[50%] translate-y-0 md:translate-y-[-50%]'
              : 'left-0 right-0 bottom-0 top-auto translate-x-0 translate-y-0 w-full max-w-none max-h-[85dvh] rounded-b-none rounded-t-2xl'
          }`}
        >
          <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 md:px-10 xl:px-25 pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+24px)]'>
            <DialogHeader>
              <DialogTitle className='text-2xl font-[500] text-mute inter text-center'>{card.title}</DialogTitle>
              <CardContent
                images={images}
                description={content.description}
                card1={content.card1}
                card2={content.card2}
                id={id}
              />
            </DialogHeader>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default InfoCard
