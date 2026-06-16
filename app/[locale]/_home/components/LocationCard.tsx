'use client'
import { useRef } from 'react'
import { PiMapPinFill } from "react-icons/pi"
import Image from 'next/image'
import { FaWalking } from "react-icons/fa";
import { LiaCarSideSolid } from "react-icons/lia";
import { LiaBusAltSolid } from "react-icons/lia";
import { GoArrowLeft, GoArrowRight } from "react-icons/go";
import { useTranslations } from 'next-intl'

export interface Location {
  title: string
  mapImage: string
  image: string
  distance: string
  walkTime?: string
  carTime?: string
  busTime?: string
  position: { lat: number, lng: number }
}

// Translucent arrow overlaid on the card edges, vertically centered on the
// photo (200px tall on mobile / 400px on desktop) — same hint pattern as the
// rooms carousel so it reads as "swipe between places".
const arrowClassName =
  "absolute top-[160px] md:top-[200px] -translate-y-1/2 z-20 grid place-items-center size-9 md:size-11 " +
  "rounded-full bg-white/60 backdrop-blur-sm border border-white/70 text-mute shadow-md " +
  "transition hover:bg-white/90 hover:text-dark active:scale-95"

const LocationCard = ({
  item,
  onPrev,
  onNext,
}: {
  item: Location | null
  index: number
  onPrev?: () => void
  onNext?: () => void
}) => {
  // Horizontal swipe → previous/next place. A small threshold keeps taps and
  // vertical scrolls from triggering navigation.
  const startX = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null) return
    const dx = e.changedTouches[0].clientX - startX.current
    startX.current = null
    if (Math.abs(dx) < 40) return
    // A real swipe shouldn't also open the underlying Google Maps link.
    e.preventDefault()
    if (dx < 0) onNext?.(); else onPrev?.()
  }

  const hasNav = !!(onPrev || onNext)

  return (
    <div
      className='relative flex flex-col gap-5 items-center w-full md:w-1/2 xl:w-1/3 md:min-w-[460px] z-10 touch-pan-y select-none'
      onTouchStart={hasNav ? handleTouchStart : undefined}
      onTouchEnd={hasNav ? handleTouchEnd : undefined}
    >
      {/* Keyed so each place change replays a soft fade/slide that matches the
          map's 500ms cross-fade (instead of a hard cut). The key is on the
          inner div ONLY — the outer wrapper holds the swipe refs/arrows and must
          not remount. */}
      <div
        key={item ? item.title : 'main'}
        className='w-full animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out'
      >
        {item ? <LocationInner item={item} /> : <MainInner />}
      </div>

      {hasNav && (
        <>
          <button
            type='button'
            aria-label='Previous place'
            onClick={(e) => { e.preventDefault(); onPrev?.() }}
            className={`${arrowClassName} left-1 md:left-2`}
          >
            <GoArrowLeft className='size-4 md:size-5' />
          </button>
          <button
            type='button'
            aria-label='Next place'
            onClick={(e) => { e.preventDefault(); onNext?.() }}
            className={`${arrowClassName} right-1 md:right-2`}
          >
            <GoArrowRight className='size-4 md:size-5' />
          </button>
        </>
      )}
    </div>
  )
}

export default LocationCard

const LocationInner = ({ item }: { item: Location }) => {
  const t = useTranslations('locationCard')
  const { image, distance, walkTime, carTime, busTime, position, title } = item
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}&query_place_id=${position.lat},${position.lng}`

  return (
    <>
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className='flex md:flex-col rounded-xl md:rounded-[30px] bg-[rgba(255,255,255,0.8)] md:bg-light-bg w-full md:shadow-xl overflow-hidden hover:scale-102 transition-all duration-300 cursor-pointer'
      >
        <div className='relative w-1/2 md:w-full md:flex-1 min-h-[200px] md:min-h-[400px]'>
          <Image src={image} alt='location' fill className='object-cover object-center'/>
        </div>
        <div className='flex flex-col p-2.5 md:p-6 gap-2 md:gap-3 text-mute flex-1'>
          <div className='text-end text-mute px-2 border rounded-full w-fit border-mute'>{distance}</div>
          {carTime && <div className=' flex  text-xs md:text-base '>
            <LiaCarSideSolid className='hidden md:block size-6 mr-2' />
            {t('drive')} <span className='font-bold ml-auto min-w-10'>{carTime}</span>
          </div>}
          {busTime && <div className=' flex  text-xs md:text-base '>
            <LiaBusAltSolid className='hidden md:block size-6 mr-2' />{t('publicTransport')} <span className='font-bold ml-auto min-w-10 '>{busTime}</span>
          </div>}
          {walkTime && <div className=' flex  text-xs md:text-base '>
            <FaWalking className='hidden md:block size-6 mr-2' />{t('walk')} <span className='font-bold ml-auto min-w-10'>{walkTime}</span>
          </div>}
        </div>
      </a>
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className=" hover:scale-120 cursor-pointer transition-all duration-300 underline"
      >
        {t('seeOnGoogleMaps')}
      </a>
    </>
  )
}

const MainInner = () => {
  const t = useTranslations('locationCard')
  const hotelAddress = "Friedrichstraße 33, 10969 Berlin"
  const googleMapsUrl = 'https://maps.app.goo.gl/f5pcoqnd5V6NTwAw6'

  return (
    <>
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className='flex md:flex-col rounded-xl bg-[rgba(255,255,255,0.8)] md:rounded-[30px] md:bg-light-bg w-full md:shadow-xl overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer'
      >
        <div className='relative w-1/2 md:w-full md:flex-1 min-h-[200px] md:min-h-[400px]'>
          <Image src='/images/hotel-image.webp' alt='location' fill className='object-cover object-center'/>
        </div>
        <div className='flex flex-col p-2.5 md:p-6 gap-2 md:gap-3 text-mute'>
          <h3 className='gap-2 flex text-xs md:text-[20px] pb-4 border-b font-bold'>
            <PiMapPinFill className='size-5 min-w-5 mt-0.5' />
            {hotelAddress}
          </h3>
          <span className='gap-2 flex items-center text-xs md:text-[20px] font-bold'>
            {t('centralStation')}
          </span>
          <div className='flex text-xs md:text-base italic md:pl-2'>
            <LiaBusAltSolid className='hidden md:block size-6 mr-2' />{t('publicTransport')} <span className='font-bold ml-auto min-w-10'>15 min</span>
          </div>
          <div className=' flex  text-xs md:text-base italic md:pl-2'>
            <LiaCarSideSolid className='hidden md:block size-6 mr-2' />
            {t('taxi')} <span className='font-bold ml-auto min-w-10'>10 min</span>
          </div>

          <span className='gap-2 flex items-center text-xs md:text-[20px] font-bold'>
            {t('airport')}
          </span>
          <div className=' flex  italic text-xs md:text-base md:pl-2'>
              <LiaBusAltSolid className='hidden md:block size-6 mr-2' />{t('publicTransport')} <span className='font-bold ml-auto min-w-10'>40 min</span>
          </div>
          <div className=' flex  italic text-xs md:text-base md:pl-2'>
            <LiaCarSideSolid className='hidden md:block size-6 mr-2' />{t('taxi')} <span className='font-bold ml-auto min-w-10'>35 min</span>
          </div>
        </div>
      </a>
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:scale-120 cursor-pointer transition-all duration-300"
      >
        {t('seeOnGoogleMaps')}
      </a>
    </>
  )
}
