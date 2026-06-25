'use client'

import { useEffect } from 'react'
import { GA_MEASUREMENT_ID, GOOGLE_ADS_ID } from '@/lib/analytics'

// Loads Google Analytics / Google Ads ONLY after the visitor grants consent via
// Cookiebot. Until then no gtag.js request is made and no connection to Google is
// opened — satisfying the "no loading before opt-in" requirement.
//
// The consent decision comes from Cookiebot's categories:
//   statistics -> Google Analytics, marketing -> Google Ads.
// We keep gtag's Consent Mode v2 state in sync on every Cookiebot decision and
// inject gtag.js once (only after at least one relevant category is granted).
export const GoogleAnalytics = () => {
  useEffect(() => {
    const primaryTagId = GA_MEASUREMENT_ID || GOOGLE_ADS_ID
    if (!primaryTagId) return // analytics not configured -> nothing to load

    let injected = false

    const ensureGtagStub = () => {
      window.dataLayer = window.dataLayer || []
      if (!window.gtag) {
        window.gtag = function gtag(...args: unknown[]) {
          window.dataLayer!.push(args)
        }
        window.gtag('consent', 'default', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
          wait_for_update: 500,
        })
        window.gtag('js', new Date())
      }
    }

    const sync = () => {
      const consent = window.Cookiebot?.consent
      if (!consent) return
      ensureGtagStub()

      window.gtag!('consent', 'update', {
        analytics_storage: consent.statistics ? 'granted' : 'denied',
        ad_storage: consent.marketing ? 'granted' : 'denied',
        ad_user_data: consent.marketing ? 'granted' : 'denied',
        ad_personalization: consent.marketing ? 'granted' : 'denied',
      })

      if (!injected && (consent.statistics || consent.marketing)) {
        injected = true
        const script = document.createElement('script')
        script.src = `https://www.googletagmanager.com/gtag/js?id=${primaryTagId}`
        script.async = true
        // Cookiebot must not re-block what we already gated on consent.
        script.setAttribute('data-cookieconsent', 'ignore')
        document.head.appendChild(script)
        if (GA_MEASUREMENT_ID) window.gtag!('config', GA_MEASUREMENT_ID, { send_page_view: false })
        if (GOOGLE_ADS_ID) window.gtag!('config', GOOGLE_ADS_ID)
      }
    }

    window.addEventListener('CookiebotOnConsentReady', sync)
    window.addEventListener('CookiebotOnAccept', sync)
    window.addEventListener('CookiebotOnDecline', sync)
    sync() // consent may already be resolved by the time this mounts

    return () => {
      window.removeEventListener('CookiebotOnConsentReady', sync)
      window.removeEventListener('CookiebotOnAccept', sync)
      window.removeEventListener('CookiebotOnDecline', sync)
    }
  }, [])

  return null
}
