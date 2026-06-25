'use client'

import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'
import { useMemo } from 'react'

// `libraries` MUST be a module-level constant. Passing a fresh array on every
// render makes @react-google-maps/api reload the Maps script repeatedly
// ("LoadScript has been reloaded unintentionally").
const MAPS_LIBRARIES: ('places')[] = ['places']

interface InteractiveMapProps {
  width: string
  height: string
  center: { lat: number; lng: number }
  isFullscreen: boolean
  image: string
  radius: string
  zoom: number
}

// Renders the actual Google Map. This component is loaded lazily (ssr:false) and
// only after the visitor activates the map in MapWindow, so Google is contacted
// strictly on user action / consent — never on page load.
export default function InteractiveMap({
  width,
  height,
  center,
  isFullscreen,
  image,
  radius,
  zoom,
}: InteractiveMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries: MAPS_LIBRARIES,
  })

  const customMarkerIcon = useMemo(() => {
    if (!isLoaded || typeof google === 'undefined') return undefined
    return {
      url: image,
      scaledSize: new google.maps.Size(39, 45),
      anchor: new google.maps.Point(13, 30),
    }
  }, [isLoaded, image])

  if (!isLoaded) {
    return (
      <div style={{ width, height }} className="text-white text-center flex items-center justify-center">
        Loading map...
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width, height, borderRadius: radius }}
      center={center}
      zoom={zoom}
      options={{
        mapId: 'map',
        zoomControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: isFullscreen,
        gestureHandling: 'cooperative',
      }}
    >
      <Marker position={center} icon={customMarkerIcon} />
    </GoogleMap>
  )
}
