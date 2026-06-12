'use client'

import { useEffect } from 'react'

export const BOOKING_SECTION_ID = 'booking-section'

const SCROLL_TO_BOOKING_STORAGE_KEY = 'charlie-m-scroll-to-booking'

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
}

export function setScrollToBookingOnNextPage() {
  // Only the mobile booking page consumes this flag. Setting it on desktop
  // left a stale flag in sessionStorage that could trigger an unexpected
  // scroll on a later mobile visit, so gate the write on the viewport.
  if (!isMobileViewport()) return
  try {
    sessionStorage.setItem(SCROLL_TO_BOOKING_STORAGE_KEY, '1')
  } catch {
    // sessionStorage unavailable (private mode, etc.)
  }
}

function shouldScrollToBooking() {
  if (!isMobileViewport()) return false

  const hasHash = window.location.hash === `#${BOOKING_SECTION_ID}`
  let hasFlag = false
  try {
    hasFlag = sessionStorage.getItem(SCROLL_TO_BOOKING_STORAGE_KEY) === '1'
  } catch {
    // ignore
  }
  return hasHash || hasFlag
}

function clearScrollToBookingFlag() {
  try {
    sessionStorage.removeItem(SCROLL_TO_BOOKING_STORAGE_KEY)
  } catch {
    // ignore
  }
}

function scrollToBookingSection() {
  const element = document.getElementById(BOOKING_SECTION_ID)
  if (!element) return false
  element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return true
}

export function useScrollToBookingSection() {
  useEffect(() => {
    if (!shouldScrollToBooking()) return

    const run = () => {
      // Attempt the scroll, then clear the flag unconditionally — a missing
      // target must not leave the flag set to fire on a later navigation.
      scrollToBookingSection()
      clearScrollToBookingFlag()
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(run)
    })
  }, [])
}
