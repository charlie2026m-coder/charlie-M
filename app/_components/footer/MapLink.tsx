'use client'
import MapWindow from './MapWindow'
import { PhoneFrame } from '@/app/_components/ui/PhoneFrame'

export default function MapLink({ url }: { url: string }) {
  return (
    <PhoneFrame
      // `isolation: isolate` keeps Google Maps' stacking context from leaking
      // over the rest of the footer (as the old wrapper did).
      style={{ isolation: 'isolate', zIndex: 1 }}
      onClick={() => window.open(url, '_blank')}
      className="map-isolated w-[92px] h-[188px] md:w-[150px] md:h-[306px] cursor-pointer"
    >
      <div style={{ pointerEvents: 'none', width: '100%', height: '100%' }}>
        {/* radius 0 — the phone screen's own rounded overflow clips the map. */}
        <MapWindow width="100%" height="100%" isFullscreen={false} radius="0px" />
      </div>
    </PhoneFrame>
  )
}
