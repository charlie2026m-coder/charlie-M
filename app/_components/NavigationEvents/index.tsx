'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageview } from '@/lib/analytics'

export function NavigationEvents() {
  const pathname = usePathname()
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    trackPageview(pathname)
  }, [pathname])

  return null
}
