'use client'
import MapWindow from './MapWindow'
import { PhoneFrame } from '@/app/_components/ui/PhoneFrame'

export default function MapLink({ url }: { url: string }) {
  return (
    // The slot keeps the OLD map footprint so the footer row height / layout is
    // unchanged. A larger phone is absolutely positioned inside, aligned to the
    // top, and the slot's overflow-hidden crops it around the middle — so the
    // phone looks like it rises out of the footer without making it taller.
    <div
      className="map-isolated relative w-[104px] h-[118px] md:w-[226px] md:h-[186px] cursor-pointer overflow-hidden"
      style={{ isolation: 'isolate', zIndex: 1 }}
      onClick={() => window.open(url, '_blank')}
    >
      <PhoneFrame className="absolute left-1/2 top-0 -translate-x-1/2 w-[100px] h-[220px] md:w-[200px] md:h-[420px]">
        {/* Nudge the map up so its centred marker (the hotel) lands in the
            visible top half instead of near the crop line. */}
        <div className="-translate-y-[28%]" style={{ pointerEvents: 'none', width: '100%', height: '100%' }}>
          {/* radius 0 — the phone screen's own rounded overflow clips the map. */}
          <MapWindow width="100%" height="100%" isFullscreen={false} radius="0px" />
        </div>
      </PhoneFrame>
    </div>
  )
}
