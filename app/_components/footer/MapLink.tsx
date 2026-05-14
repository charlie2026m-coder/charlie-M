'use client'
import MapWindow from './MapWindow'

export default function MapLink({ url }: { url: string }) {
  return (
    <div
      className="map-isolated relative w-[94px] h-[94px] md:w-[226px] md:h-[186px] cursor-pointer"
      style={{ isolation: 'isolate', zIndex: 1 }}
      onClick={() => window.open(url, '_blank')}
    >
      <div style={{ pointerEvents: 'none', width: '100%', height: '100%' }}>
        <MapWindow width="100%" height="100%" isFullscreen={false} />
      </div>
    </div>
  )
}
