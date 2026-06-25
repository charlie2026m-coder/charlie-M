'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

// Google Maps loads ONLY after the visitor gives consent (Cookiebot "marketing"
// category) — never before. Until then a neutral placeholder is shown and NO
// request reaches Google. The choice is remembered so it persists across pages.
const InteractiveMap = dynamic(() => import('@/app/_components/CookieConsent/InteractiveMap'), {
  ssr: false,
})

const MAPS_CONSENT_KEY = 'charlie_maps_consent'

const defaultCenter = {
  lat: 52.504992498425274,
  lng: 13.391040308320248,
}

export default function MapWindow({
  width = '100%',
  height = '400px',
  center = defaultCenter,
  isFullscreen = true,
  image = '/images/map-marker.svg',
  radius = '30px',
  zoom = 16,
}: {
  width?: string
  height?: string
  center?: { lat: number; lng: number }
  isFullscreen?: boolean
  image?: string
  radius?: string
  zoom?: number
}) {
  const t = useTranslations('cookies')
  const [activated, setActivated] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(MAPS_CONSENT_KEY) === '1') {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client read of persisted consent
        setActivated(true)
        return
      }
    } catch {
      /* localStorage unavailable */
    }

    // Auto-load once the visitor consents (Google Maps = marketing category).
    const check = () => {
      const consent = window.Cookiebot?.consent
      if (consent?.marketing) {
        try {
          localStorage.setItem(MAPS_CONSENT_KEY, '1')
        } catch {
          /* ignore */
        }
        setActivated(true)
      }
    }
    check()
    window.addEventListener('CookiebotOnConsentReady', check)
    window.addEventListener('CookiebotOnAccept', check)
    return () => {
      window.removeEventListener('CookiebotOnConsentReady', check)
      window.removeEventListener('CookiebotOnAccept', check)
    }
  }, [])

  // Direct activation by clicking the placeholder (two-click solution).
  const activate = () => {
    try {
      localStorage.setItem(MAPS_CONSENT_KEY, '1')
    } catch {
      /* ignore */
    }
    setActivated(true)
  }

  if (activated) {
    return (
      <InteractiveMap
        width={width}
        height={height}
        center={center}
        isFullscreen={isFullscreen}
        image={image}
        radius={radius}
        zoom={zoom}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={activate}
      style={{ width, height, borderRadius: radius }}
      className="relative flex flex-col items-center justify-center gap-1.5 bg-gray-200 text-center p-2 cursor-pointer overflow-hidden"
      aria-label={t('mapLoad')}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" className="w-5 h-6 md:w-6 md:h-7 opacity-70" />
      <span className="text-[10px] md:text-xs text-gray-600 leading-tight">{t('mapLoad')}</span>
    </button>
  )
}
