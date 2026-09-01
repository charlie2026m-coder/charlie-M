'use client'

import { useEffect } from 'react'

/**
 * Start a page at the top.
 *
 * Opening a studio from the listing landed the guest mid-gallery instead of at
 * the room name. Two things do that: the browser restores the previous scroll
 * position on a client-side navigation, and this page's height grows after
 * mount as the gallery images resolve — so even a correct initial scroll ends
 * up somewhere else once the layout settles.
 *
 * A deep link with a hash (#room-booking-card) is left alone: there the guest
 * asked for a specific spot, and yanking them to the top would undo it.
 */
export default function ScrollToTopOnMount() {
  useEffect(() => {
    if (window.location.hash) return

    // Stop the browser from restoring the old offset over ours.
    const previous = window.history.scrollRestoration
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })

    // Images and fonts land a beat later and can shift things; one repeat on
    // the next frame catches that without fighting a guest who has already
    // started scrolling.
    const raf = requestAnimationFrame(() => {
      if (window.scrollY < 400) window.scrollTo({ top: 0, left: 0 })
    })

    return () => {
      cancelAnimationFrame(raf)
      if ('scrollRestoration' in window.history && previous) {
        window.history.scrollRestoration = previous
      }
    }
  }, [])

  return null
}
