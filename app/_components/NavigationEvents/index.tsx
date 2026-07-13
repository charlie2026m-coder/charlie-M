'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageview, whenGtagReady } from '@/lib/analytics'

export function NavigationEvents() {
  const pathname = usePathname()
  const prev = useRef<string | null>(null)

  useEffect(() => {
    if (pathname === prev.current) return
    prev.current = pathname
    // gtag loads only after consent — the FIRST (landing) pageview would fire
    // before gtag exists and be lost, so wait for it. (We no longer skip the
    // first pathname: with send_page_view:false nothing else records the
    // landing page, so skipping it dropped that pageview entirely.)
    return whenGtagReady(() => trackPageview(pathname))
  }, [pathname])

  return null
}
