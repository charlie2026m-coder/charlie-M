'use client'

import { useEffect, useRef } from 'react'
import { COOKIEBOT_CBID } from '@/lib/cookiebot'

// Embeds Cookiebot's auto-generated, always-up-to-date cookie declaration table
// (name / provider / purpose / expiry of every cookie, continuously scanned).
// Rendered inside the privacy policy page to satisfy the transparency requirement.
export const CookieDeclaration = () => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = ref.current
    if (!host || host.querySelector('script')) return
    const script = document.createElement('script')
    script.id = 'CookieDeclaration'
    script.src = `https://consent.cookiebot.com/${COOKIEBOT_CBID}/cd.js`
    script.async = true
    host.appendChild(script)
  }, [])

  return <div ref={ref} className="w-full" />
}
