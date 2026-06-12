'use client'

import { useEffect } from 'react'

export const BOOKING_SECTION_ID = 'booking-section'

const SCROLL_TO_BOOKING_STORAGE_KEY = 'charlie-m-scroll-to-booking'

export function setScrollToBookingOnNextPage() {
  try {
    sessionStorage.setItem(SCROLL_TO_BOOKING_STORAGE_KEY, '1')
  } catch {
    // sessionStorage unavailable (private mode, etc.)
  }
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 767px)').matches
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
      if (scrollToBookingSection()) {
        clearScrollToBookingFlag()
      }
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(run)
    })
  }, [])
}
