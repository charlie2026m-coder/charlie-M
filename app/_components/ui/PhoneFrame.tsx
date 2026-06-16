import { cn } from '@/lib/utils'

/**
 * A black smartphone mockup frame (rounded body, Dynamic Island, side buttons)
 * that wraps any content on its "screen". Used in the footer to present the
 * Google map as if it were shown on a phone. Set the outer size via `className`
 * (e.g. `w-[92px] h-[188px] md:w-[150px] md:h-[306px]`); the body/screen fill it.
 */
export function PhoneFrame({
  children,
  className,
  onClick,
  style,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  style?: React.CSSProperties
}) {
  return (
    <div className={cn('relative shrink-0', className)} onClick={onClick} style={style}>
      {/* Phone body */}
      <div className="h-full w-full rounded-[1.8rem] md:rounded-[2.4rem] bg-[#0b0b0d] p-[4px] md:p-[6px] shadow-[0_12px_30px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden rounded-[1.5rem] md:rounded-[2rem] bg-black">
          {children}
          {/* Dynamic Island */}
          <div className="pointer-events-none absolute left-1/2 top-1 md:top-2 z-20 h-2.5 w-9 md:h-3.5 md:w-14 -translate-x-1/2 rounded-full bg-black" />
        </div>
      </div>
      {/* Side buttons (volume + power) for a touch of realism */}
      <span className="pointer-events-none absolute -left-px top-[24%] h-5 md:h-8 w-[2px] md:w-[3px] rounded-l-sm bg-[#0b0b0d]" />
      <span className="pointer-events-none absolute -left-px top-[37%] h-7 md:h-11 w-[2px] md:w-[3px] rounded-l-sm bg-[#0b0b0d]" />
      <span className="pointer-events-none absolute -right-px top-[30%] h-8 md:h-12 w-[2px] md:w-[3px] rounded-r-sm bg-[#0b0b0d]" />
    </div>
  )
}
