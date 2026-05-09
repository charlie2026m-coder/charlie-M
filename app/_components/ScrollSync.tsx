'use client'
import { useEffect } from 'react'
import { useScrollStore } from '@/store/useScrollStore'

export default function ScrollSync() {
  const updateScroll = useScrollStore(s => s.updateScroll)
  const setDiscountClosed = useScrollStore(s => s.setDiscountClosed)

  useEffect(() => {
    setDiscountClosed(sessionStorage.getItem('discountBannerClosed') === 'true')

    let ticking = false
    const handleScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        updateScroll(window.scrollY)
        ticking = false
      })
    }

    updateScroll(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [updateScroll, setDiscountClosed])

  return null
}
