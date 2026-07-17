'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** Stagger delay in ms once the element scrolls into view. */
  delay?: number
  className?: string
}

/**
 * Fade + rise into view when scrolled to. Robust by design: the server renders
 * content VISIBLE ('auto'), and JS only hides+animates elements that are still
 * below the fold at mount. So with JS off / hydration failed / reduced-motion,
 * the content is simply shown — it can never be left permanently invisible.
 */
export function Reveal({ children, delay = 0, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'auto' | 'hidden' | 'shown'>('auto')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) return // leave visible
    // Already in / near view at mount → don't animate, just stay visible.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return
    // Below the fold (off-screen) → hide instantly, then reveal on scroll.
    setPhase('hidden')
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase('shown')
          io.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const stateClass =
    phase === 'hidden'
      ? 'opacity-0 translate-y-8'
      : phase === 'shown'
        ? 'opacity-100 translate-y-0 transition-all duration-700 ease-out will-change-[opacity,transform]'
        : '' // auto: untouched, visible

  return (
    <div
      ref={ref}
      className={`${stateClass} ${className}`}
      style={phase === 'shown' ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
