'use client'
import { ReactNode, useEffect, useRef } from 'react'
import { useScrollStore, STICKY_HEADER_HEIGHT } from '@/store/useScrollStore'

export default function OriginalCheckInFormWrapper({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const scrollY = useScrollStore(s => s.scrollY)
  const isHeaderVisible = useScrollStore(s => s.isHeaderVisible)
  const isHomeStickyActive = useScrollStore(s => s.isHomeStickyActive)
  const setHomeStickyActive = useScrollStore(s => s.setHomeStickyActive)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const topThreshold = isHeaderVisible ? STICKY_HEADER_HEIGHT + 8 : 8
    const shouldBeSticky = rect.top <= topThreshold
    if (shouldBeSticky !== isHomeStickyActive) {
      setHomeStickyActive(shouldBeSticky)
    }
  }, [scrollY, isHeaderVisible, isHomeStickyActive, setHomeStickyActive])

  useEffect(() => {
    return () => setHomeStickyActive(false)
  }, [setHomeStickyActive])

  return (
    <div
      ref={ref}
      style={isHomeStickyActive ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
    >
      {children}
    </div>
  )
}
