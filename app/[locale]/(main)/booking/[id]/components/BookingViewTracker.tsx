'use client'
import { useEffect, useRef } from 'react'
import { trackAddToCart, whenGtagReady } from '@/lib/analytics'

// Fires GA4 add_to_cart once when the booking step (/booking/[id]) mounts — the
// guest clicked "Book Now" and reached the booking flow. Waits for gtag (it
// loads after consent, possibly after this mounts). Renders nothing.
const BookingViewTracker = ({ value, roomName }: { value: number; roomName: string }) => {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    return whenGtagReady(() => {
      if (tracked.current) return
      tracked.current = true
      trackAddToCart({ value, roomName })
    })
  }, [value, roomName])

  return null
}

export default BookingViewTracker
