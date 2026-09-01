'use client'
import MapWindow from './MapWindow'
import { PhoneFrame } from '@/app/_components/ui/PhoneFrame'
import { useEffect, useState } from 'react'

export default function MapLink({ url }: { url: string }) {
  // The phone is tiny on mobile (~92px wide), so zoom 16 looks far too close.
  // Zoom out a couple of levels there; keep the closer view on desktop.
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return (
    // The slot keeps the OLD map footprint so the footer row height / layout is
    // unchanged. A larger phone is absolutely positioned inside, aligned to the
    // top, and the slot's overflow-hidden crops it around the middle — so the
    // phone looks like it rises out of the footer without making it taller.
    // A real anchor, not a div calling window.open(): on iOS that opened a tab,
    // then handed the URL to the Maps app, leaving the tab on about:blank — so
    // "back" returned the guest to a blank page instead of the site. Navigating
    // in place lets Safari hand off to Maps and keeps us in the back stack.
    <a
      href={url}
      aria-label="Open in Google Maps"
      className="map-isolated relative block w-[104px] h-[118px] md:w-[226px] md:h-[186px] cursor-pointer overflow-hidden"
      style={{ isolation: 'isolate', zIndex: 1 }}
    >
      <PhoneFrame className="absolute left-1/2 top-0 -translate-x-1/2 w-[100px] h-[220px] md:w-[200px] md:h-[420px]">
        {/* The map fills ONLY the visible (cropped) height of the phone, so its
            centred hotel marker lands in the middle of what's actually shown —
            instead of in the centre of the full tall phone, where the crop hides
            it. Matches the slot height below. */}
        <div className="h-[118px] md:h-[186px] w-full" style={{ pointerEvents: 'none' }}>
          {/* radius 0 — the phone screen's own rounded overflow clips the map. */}
          <MapWindow width="100%" height="100%" isFullscreen={false} radius="0px" zoom={isDesktop ? 16 : 14} />
        </div>
      </PhoneFrame>
    </a>
  )
}
