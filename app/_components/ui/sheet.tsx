"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"

import { cn } from "@/lib/utils"

const SHEET_DURATION_MS = 600

const sheetMotionClass = cn(
  "animation-duration-600",
  "ease-[cubic-bezier(0.32,0.72,0,1)]",
  "fill-mode-forwards"
)

const sheetTransition = `transform ${SHEET_DURATION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`

const panelClass = "inset-y-0 left-0 h-full w-full"
const panelMotion = {
  in: "animate-in slide-in-from-left",
  out: "animate-out slide-out-to-left",
}

/** Slow drag: fraction of width before release closes — you tune this. */
const SWIPE_CLOSE_THRESHOLD = 0.2
/** px/ms — fast flick closes even below SWIPE_CLOSE_THRESHOLD (~500px/s at 0.5). */
const SWIPE_FLICK_VELOCITY = 0.5
const VELOCITY_WINDOW_MS = 120
const FLICK_VELOCITY_WINDOW_MS = 80

type VelocitySample = { pos: number; t: number }

function getFlickVelocity(samples: VelocitySample[]): number {
  if (samples.length < 2) return 0
  const last = samples[samples.length - 1]
  const prev = samples[samples.length - 2]

  const dtInstant = last.t - prev.t
  const vInstant = dtInstant > 0 ? (last.pos - prev.pos) / dtInstant : 0

  let start = samples[0]
  for (let i = samples.length - 2; i >= 0; i--) {
    if (last.t - samples[i].t >= FLICK_VELOCITY_WINDOW_MS) {
      start = samples[i]
      break
    }
  }
  const dtWindow = last.t - start.t
  const vWindow = dtWindow >= 16 ? (last.pos - start.pos) / dtWindow : vInstant

  return Math.min(vInstant, vWindow)
}

function getDraggedFraction(offset: number, size: number): number {
  if (size <= 0) return 0
  return Math.max(0, -offset) / size
}

type SheetMotionContextValue = {
  open: boolean
  exiting: boolean
  requestInstantUnmount: () => void
  onOpenChange?: (open: boolean) => void
}

const SheetMotionContext = React.createContext<SheetMotionContextValue>({
  open: false,
  exiting: false,
  requestInstantUnmount: () => {},
})

function useSheetExit(open: boolean, instantUnmountRef: React.RefObject<boolean>) {
  const [exiting, setExiting] = React.useState(false)
  const wasOpen = React.useRef(false)

  React.useEffect(() => {
    if (open) {
      wasOpen.current = true
      setExiting(false)
      return
    }

    if (!wasOpen.current) return

    wasOpen.current = false

    if (instantUnmountRef.current) {
      instantUnmountRef.current = false
      setExiting(false)
      return
    }

    setExiting(true)
    const id = setTimeout(() => setExiting(false), SHEET_DURATION_MS)
    return () => clearTimeout(id)
  }, [open, instantUnmountRef])

  return exiting
}

function Sheet({
  open = false,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Root>) {
  const instantUnmountRef = React.useRef(false)
  const exiting = useSheetExit(open, instantUnmountRef)
  const mounted = open || exiting

  const requestInstantUnmount = React.useCallback(() => {
    instantUnmountRef.current = true
  }, [])

  return (
    <SheetMotionContext.Provider
      value={{ open, exiting, requestInstantUnmount, onOpenChange }}
    >
      <SheetPrimitive.Root open={mounted} onOpenChange={onOpenChange} {...props} />
    </SheetMotionContext.Provider>
  )
}

const SheetClose = SheetPrimitive.Close

function SheetContent({
  className,
  children,
  swipeToClose = false,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  swipeToClose?: boolean
}) {
  const { open, exiting, requestInstantUnmount, onOpenChange } =
    React.useContext(SheetMotionContext)
  const ref = React.useRef<HTMLDivElement>(null)
  const [panelWidth, setPanelWidth] = React.useState(1)
  const [dragPx, setDragPx] = React.useState<number | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [enterSettled, setEnterSettled] = React.useState(false)
  const dragPxRef = React.useRef<number | null>(null)
  const pointer = React.useRef({ x: 0, y: 0, scrollTop: 0 })
  const velocitySamples = React.useRef<VelocitySample[]>([])
  const swipeCloseCommitted = React.useRef(false)

  React.useEffect(() => {
    if (!open) {
      setEnterSettled(false)
      setDragPx(null)
      dragPxRef.current = null
      setIsDragging(false)
      swipeCloseCommitted.current = false
      velocitySamples.current = []
      return
    }

    dragPxRef.current = null
    setDragPx(null)
    setIsDragging(false)
  }, [open])

  React.useEffect(() => {
    if (!open || enterSettled) return
    const id = setTimeout(() => setEnterSettled(true), SHEET_DURATION_MS)
    return () => clearTimeout(id)
  }, [open, enterSettled])

  const finishSwipeClose = React.useCallback(() => {
    if (swipeCloseCommitted.current) return
    swipeCloseCommitted.current = true
    dragPxRef.current = null
    setDragPx(null)
    setIsDragging(false)
    setEnterSettled(true)
    requestInstantUnmount()
    onOpenChange?.(false)
  }, [onOpenChange, requestInstantUnmount])

  if (!open && !exiting) return null

  const useManualTransform = dragPx !== null
  const showEnterAnimation = open && !exiting && !enterSettled && !useManualTransform
  const showExitAnimation = exiting && !useManualTransform

  const syncPanelWidth = () => {
    const w = ref.current?.offsetWidth
    if (w && w > 0) setPanelWidth(w)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!swipeToClose || e.button !== 0) return
    const scroll = (e.target as HTMLElement).closest("[data-sheet-scroll]")
    pointer.current = { x: e.clientX, y: e.clientY, scrollTop: scroll?.scrollTop ?? 0 }
    velocitySamples.current = [{ pos: e.clientX, t: performance.now() }]
    syncPanelWidth()
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!swipeToClose || !e.currentTarget.hasPointerCapture(e.pointerId)) return
    const dx = e.clientX - pointer.current.x
    const dy = e.clientY - pointer.current.y

    if (!isDragging) {
      if (pointer.current.scrollTop > 0 && Math.abs(dy) > Math.abs(dx)) return
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      if (Math.abs(dy) > Math.abs(dx)) return
      if (dx >= 0) return
      setEnterSettled(true)
      setIsDragging(true)
      syncPanelWidth()
    }

    const now = performance.now()
    velocitySamples.current.push({ pos: e.clientX, t: now })
    velocitySamples.current = velocitySamples.current.filter((s) => now - s.t <= VELOCITY_WINDOW_MS)

    const w = ref.current?.offsetWidth ?? panelWidth
    const next = Math.min(0, Math.max(-w, dx))
    dragPxRef.current = next
    setDragPx(next)
  }

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (!isDragging) return

    velocitySamples.current.push({ pos: e.clientX, t: performance.now() })

    const w = ref.current?.offsetWidth ?? panelWidth
    syncPanelWidth()
    const offset = dragPxRef.current ?? 0
    const velocity = getFlickVelocity(velocitySamples.current)
    velocitySamples.current = []
    const draggedFraction = getDraggedFraction(offset, w)
    const shouldClose =
      draggedFraction >= SWIPE_CLOSE_THRESHOLD || velocity < -SWIPE_FLICK_VELOCITY

    setIsDragging(false)

    if (shouldClose) {
      dragPxRef.current = -w
      setDragPx(-w)
      if (-offset >= w - 2) finishSwipeClose()
    } else if (Math.abs(offset) < 2) {
      dragPxRef.current = null
      setDragPx(null)
      setEnterSettled(true)
    } else {
      dragPxRef.current = 0
      setDragPx(0)
    }
  }

  const onPanelTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== "transform" || e.target !== e.currentTarget) return

    const w = ref.current?.offsetWidth ?? panelWidth
    const offset = dragPxRef.current
    if (offset === null) return

    if (offset <= -w + 2) {
      finishSwipeClose()
      return
    }

    if (offset === 0) {
      dragPxRef.current = null
      setDragPx(null)
      setEnterSettled(true)
    }
  }

  const panelTransformStyle: React.CSSProperties | undefined =
    dragPx !== null
      ? {
          transform: `translate3d(${dragPx}px, 0, 0)`,
          transition: isDragging ? "none" : sheetTransition,
        }
      : undefined

  return (
    <SheetPrimitive.Portal>
      <div
        className={cn(
          "fixed inset-0 z-50",
          exiting && !open && "pointer-events-none"
        )}
      >
        <SheetPrimitive.Overlay
          className={cn(
            "fixed inset-0 bg-black/50",
            showEnterAnimation && cn(sheetMotionClass, "animate-in fade-in-0"),
            showExitAnimation && cn(sheetMotionClass, "animate-out fade-out-0")
          )}
          style={
            useManualTransform
              ? {
                  opacity: 0.5 * (1 - Math.min(1, -dragPx / panelWidth)),
                  transition: isDragging
                    ? "none"
                    : `opacity ${SHEET_DURATION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
                }
              : undefined
          }
        />
        <SheetPrimitive.Content
          ref={ref}
          className={cn(
            "fixed z-50 flex flex-col bg-background",
            panelClass,
            showEnterAnimation && cn(sheetMotionClass, panelMotion.in),
            showExitAnimation && cn(sheetMotionClass, panelMotion.out),
            className
          )}
          style={panelTransformStyle}
          onTransitionEnd={swipeToClose ? onPanelTransitionEnd : undefined}
          onPointerDown={swipeToClose ? onPointerDown : undefined}
          onPointerMove={swipeToClose ? onPointerMove : undefined}
          onPointerUp={swipeToClose ? endPointer : undefined}
          onPointerCancel={swipeToClose ? endPointer : undefined}
          {...props}
        >
          {children}
        </SheetPrimitive.Content>
      </div>
    </SheetPrimitive.Portal>
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title className={cn("text-foreground font-semibold", className)} {...props} />
  )
}

export { Sheet, SheetClose, SheetContent, SheetTitle }
