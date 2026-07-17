'use client'
import { IoMdImage } from "react-icons/io";
import { FiMapPin } from "react-icons/fi";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from 'next/image'
import { Dialog, DialogContent } from "@/app/_components/ui/dialog";
import { IoChevronBack, IoChevronForward, IoClose } from "react-icons/io5";
import { useTranslations } from 'next-intl'
import { HOTEL_INFO } from '@/lib/Constants'
import { cn } from "@/lib/utils";

const PhotoGallery = ({ images, roomName }: { images: string[]; roomName?: string }) => {
  const [showImages, setShowImages] = useState<null | number>(null);
  const t = useTranslations('gallery')
  // Query the place by NAME + ADDRESS (not raw lat/lng) so both the embedded map
  // and the "View on map" link resolve to the actual property — a bare
  // coordinate opens an unnamed point ("add a missing place").
  const mapQuery = encodeURIComponent(
    `${HOTEL_INFO.name}, ${HOTEL_INFO.address.streetAddress}, ${HOTEL_INFO.address.postalCode} ${HOTEL_INFO.address.addressLocality}`,
  )

  // Check if there are no images
  const hasImages = images && images.length > 0

  const nextPhoto = useCallback(() => {
    setShowImages((current) => {
      if (current === null) return null
      if (current === images.length - 1) return 0
      return current + 1
    })
  }, [images.length])

  const prevPhoto = useCallback(() => {
    setShowImages((current) => {
      if (current === null) return null
      if (current === 0) return images.length - 1
      return current - 1
    })
  }, [images.length])

  useEffect(() => {
    if (showImages === null) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevPhoto()
      else if (e.key === 'ArrowRight') nextPhoto()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showImages, prevPhoto, nextPhoto])

  const handlePrevClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    prevPhoto()
  }

  const handleNextClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    nextPhoto()
  }

  // Touch swipe (mobile): a horizontal drag changes the photo — swipe left →
  // next, swipe right → previous. A tap (tiny delta) is ignored so the
  // tap-to-advance / arrow controls still work.
  const dragStartX = useRef<number | null>(null)
  const dragDelta = useRef(0)
  const swiped = useRef(false)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const onTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.touches[0]?.clientX ?? null
    dragDelta.current = 0
    swiped.current = false
    setDragging(true)
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStartX.current === null) return
    const dx = (e.touches[0]?.clientX ?? dragStartX.current) - dragStartX.current
    dragDelta.current = dx
    setDragX(dx)
    if (Math.abs(dx) > 10) swiped.current = true
  }
  const onTouchEnd = () => {
    const dx = dragDelta.current
    dragStartX.current = null
    setDragging(false)
    setDragX(0)
    if (dx <= -60) nextPhoto()
    else if (dx >= 60) prevPhoto()
  }

  // Desktop close button — anchored to the PHOTO's corner, not the frame's.
  // The photo is object-contain inside a fixed frame, so its rendered box
  // varies per aspect ratio; the frame-corner X ends up floating far away in
  // the dark for most photos. Measure the visible photo rect and glide the X
  // to each photo's top-right corner.
  const stageRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [closePos, setClosePos] = useState<{ top: number; left: number } | null>(null)
  const measureClose = useCallback(() => {
    const stage = stageRef.current
    const img = imgRef.current
    if (!stage || !img || !img.complete || img.naturalWidth === 0) return
    const s = stage.getBoundingClientRect()
    const r = img.getBoundingClientRect()
    // 10px inset inside the photo; 40px = button size.
    const top = r.top - s.top + 10
    const left = r.right - s.left - 10 - 40
    // Bail out on sub-pixel jitter so the interval loop below doesn't re-render.
    setClosePos((prev) =>
      prev && Math.abs(prev.top - top) < 0.5 && Math.abs(prev.left - left) < 0.5
        ? prev
        : { top, left },
    )
  }, [])
  // A single measure lands mid Radix open-animation (rects are in flight) —
  // sample a few times until layout settles. Timeout-based, not rAF: frames
  // can be throttled (hidden/embedded tabs) while timers still run.
  const measureSoon = useCallback(() => {
    const ids = [0, 80, 180, 320, 550].map((ms) => window.setTimeout(measureClose, ms))
    return () => ids.forEach((id) => clearTimeout(id))
  }, [measureClose])
  useEffect(() => {
    if (showImages === null) {
      // Deferred (not a synchronous setState in the effect body) — clears the
      // pinned-close position once the lightbox is closed.
      const id = requestAnimationFrame(() => setClosePos(null))
      return () => cancelAnimationFrame(id)
    }
    const stop = measureSoon()
    // Cheap safety net while the lightbox is open: re-check the photo box every
    // 500ms so ANY layout shift (mobile URL bar, zoom, slow image swap) re-pins
    // the X — the bail-out in measureClose makes no-change ticks free.
    const iv = window.setInterval(measureClose, 500)
    window.addEventListener('resize', measureClose)
    return () => { stop(); clearInterval(iv); window.removeEventListener('resize', measureClose) }
  }, [showImages, measureSoon, measureClose])

  // Desktop filmstrip: click a thumb to jump straight to that photo with a
  // quick dip-fade; the active thumb stays centered in the strip.
  const [fading, setFading] = useState(false)
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([])
  const wasOpen = useRef(false)
  const jumpTo = (i: number) => {
    if (showImages === null || i === showImages || fading) return
    setFading(true)
    window.setTimeout(() => {
      // Guard against the dialog being closed mid-fade — don't reopen it.
      setShowImages((prev) => (prev === null ? null : i))
      // Timer (not rAF): frames can be throttled while timers still run.
      window.setTimeout(() => setFading(false), 30)
    }, 160)
  }
  // Desktop hover-preview: sweeping the cursor across the strip scrubs the
  // main photo live (all URLs are already warm from the thumbs, so the swap is
  // instant). Click stays for touch/keyboard.
  const stripHover = useRef(false)
  const hoverTo = (i: number) => {
    if (fading || showImages === null || i === showImages) return
    setShowImages(i)
  }
  useEffect(() => {
    if (showImages === null) { wasOpen.current = false; return }
    const behavior: ScrollBehavior = wasOpen.current ? 'smooth' : 'auto'
    wasOpen.current = true
    // Don't auto-center while the cursor is on the strip — the scroll would
    // shift the thumbs under the pointer and re-trigger hover in a loop.
    if (stripHover.current) return
    thumbRefs.current[showImages]?.scrollIntoView({
      behavior,
      inline: 'center',
      block: 'nearest',
    })
  }, [showImages])

  // Show placeholder if no images
  if (!hasImages) {
    return (
      <div className='mb-[30px]'>
        <div className='relative rounded-4xl overflow-hidden'>
          <Image 
            src='/images/image-placeholder.webp'
            alt='No images available' 
            width={1200} 
            height={300} 
            className='w-full h-[300px] object-cover' 
          />
        </div>
      </div>
    )
  }

  return (
    <div className='grid lg:grid-cols-2 gap-4  mb-[30px]'>
      
      <div className='lg:col-span-1 relative group rounded-4xl overflow-hidden'>
        <Image 
          onClick={() => setShowImages(0)}
          src={images[0]} 
          alt={roomName ? `${roomName} at Charlie M Hotel Berlin - main view` : 'Hotel room at Charlie M Hotel Berlin'} 
          width={600} 
          height={460} 
          className='w-full h-full max-h-[260px] md:max-h-[360px] lg:max-h-[460px] object-cover transition-transform duration-500 ease-out cursor-pointer group-hover:scale-110' 
        />
        <div className=' flex items-center gap-1  px-4 py-2 rounded-full bg-white absolute bottom-5 right-5'>
          <IoMdImage className='size-5 ' />{images.length} Photos
        </div>
      </div>

      <div className='lg:col-span-1 relative h-full'>
        {(images.length >= 2 && images.length <= 4) && (
          <div className='flex flex-row gap-4 h-full max-h-[260px] md:max-h-[360px] lg:max-h-[460px]'>
            {images.slice(1, 4).map((image, index) => (
              <div key={index} className='group rounded-[30px] overflow-hidden flex-1'>
                <Image 
                  onClick={() => setShowImages(index + 1)} 
                  src={image} 
                  alt={roomName ? `${roomName} - view ${index + 2}` : `Hotel room view ${index + 2}`} 
                  width={600} 
                  height={460} 
                  className='w-full h-full object-cover transition-transform duration-500 ease-out cursor-pointer group-hover:scale-110' 
                />
              </div>
            ))}
          </div>
        )}

        {images.length >= 5 && (
          <div className='grid grid-cols-2 gap-4 h-full max-h-[260px] md:max-h-[360px] lg:max-h-[460px]'>
            {images.slice(1, 4).map((image, index) => (
              <div key={index} className='col-span-1 group rounded-[30px] overflow-hidden'>
                <Image
                  onClick={() => setShowImages(index + 1)}
                  src={image}
                  alt={roomName ? `${roomName} - view ${index + 2}` : `Hotel room view ${index + 2}`}
                  width={300}
                  height={222}
                  className='w-full h-[126px] md:h-[222px] object-cover transition-transform duration-500 ease-out cursor-pointer group-hover:scale-110'
                />
              </div>
            ))}
            {/* Bottom-right tile = mini-map with the hotel pin. Replaces a photo
                (which stays viewable in the lightbox). Keyless Google embed. */}
            <div className='col-span-1 relative rounded-[30px] overflow-hidden bg-light2'>
              <iframe
                title={t('location')}
                src={`https://www.google.com/maps?q=${mapQuery}&z=16&output=embed`}
                className='w-full h-[126px] md:h-[222px] border-0'
                loading='lazy'
                referrerPolicy='no-referrer-when-downgrade'
              />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                target='_blank'
                rel='noopener noreferrer'
                className='absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-blue shadow-sm hover:bg-white transition-colors'
              >
                <FiMapPin className='size-3.5' /> {t('viewOnMap')}
              </a>
            </div>
          </div>
        )}
      </div>
      <Dialog
        open={showImages !== null}
        onOpenChange={(open) => {
          if (!open) setShowImages(null)
        }}
      >
        <DialogContent
          className='p-0 !rounded-none w-[95vw] md:w-[90vw] max-w-[1400px] h-[85vh] max-h-[85vh] overflow-hidden border-0 bg-transparent shadow-none flex flex-col gap-0 [&>button]:text-white [&>button]:z-20 [&>button]:top-2 [&>button]:right-2 [&>button]:md:hidden'
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* Fixed-size frame so the modal + arrows never resize when photos have
              different aspect ratios; the image just fits inside (object-contain). */}
          <div
            ref={stageRef}
            className='relative flex min-h-0 flex-1 w-full items-center justify-center select-none touch-pan-y overflow-hidden'
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={images[showImages || 0]}
              alt={roomName ? `${roomName} - view ${(showImages || 0) + 1}` : `Hotel room view ${(showImages || 0) + 1}`}
              draggable={false}
              onLoad={() => measureSoon()}
              style={{
                transform: `translateX(${dragX}px)`,
                opacity: fading ? 0 : 1,
                transition: dragging ? 'none' : 'transform 200ms ease, opacity 160ms ease',
              }}
              className='max-h-full max-w-full w-auto h-auto object-contain block cursor-pointer'
              onClick={() => { if (!swiped.current) nextPhoto() }}
            />
            {/* Desktop close — sits ON the photo's top-right corner (measured),
                gliding along as photos of different ratios come and go. Mobile
                keeps the built-in frame-corner close. */}
            {closePos && (
              <button
                type='button'
                aria-label='Close'
                onClick={() => setShowImages(null)}
                style={{ top: closePos.top, left: closePos.left }}
                className='absolute z-20 hidden md:grid place-items-center size-10 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-[top,left,background-color] duration-300 ease-out'
              >
                <IoClose className='size-6' />
              </button>
            )}
            <button
              type='button'
              aria-label='Previous photo'
              onClick={handlePrevClick}
              className='absolute left-1 md:left-3 top-1/2 -translate-y-1/2 z-10 grid place-items-center size-11 md:size-14 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors'
            >
              <IoChevronBack className='size-6 md:size-8' />
            </button>
            <button
              type='button'
              aria-label='Next photo'
              onClick={handleNextClick}
              className='absolute right-1 md:right-3 top-1/2 -translate-y-1/2 z-10 grid place-items-center size-11 md:size-14 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors'
            >
              <IoChevronForward className='size-6 md:size-8' />
            </button>
            <div className='md:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-10 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full whitespace-nowrap'>
              {(showImages || 0) + 1} / {images.length}
            </div>
          </div>

          {/* Desktop filmstrip — every photo at a glance; click to jump straight
              to it. Active thumb pops (ring + scale), inactive ones sit dimmed;
              the strip auto-centers on the active photo. */}
          <div className='hidden md:block w-full shrink-0 pt-3'>
            <div
              className='mx-auto flex w-fit max-w-full gap-2.5 overflow-x-auto px-2 py-1.5'
              style={{ scrollbarWidth: 'none' }}
              onMouseEnter={() => { stripHover.current = true }}
              onMouseLeave={() => {
                stripHover.current = false
                // Cursor left the strip — now it's safe to center the active thumb.
                if (showImages !== null) {
                  thumbRefs.current[showImages]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
                }
              }}
            >
              {images.map((image, i) => (
                <button
                  key={i}
                  ref={(el) => { thumbRefs.current[i] = el }}
                  type='button'
                  aria-label={`Photo ${i + 1} / ${images.length}`}
                  aria-current={showImages === i}
                  onMouseEnter={() => hoverTo(i)}
                  onClick={() => jumpTo(i)}
                  className={cn(
                    'relative h-12 w-[72px] lg:h-14 lg:w-20 shrink-0 overflow-hidden rounded-xl transition-all duration-300 ease-out',
                    showImages === i
                      ? 'opacity-100 ring-2 ring-white scale-110'
                      : 'opacity-45 ring-1 ring-white/15 hover:opacity-90 hover:scale-[1.04]',
                  )}
                >
                  <Image src={image} alt='' fill sizes='80px' className='object-cover' />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PhotoGallery