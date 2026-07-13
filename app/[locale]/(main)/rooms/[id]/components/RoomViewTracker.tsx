'use client'
import { useEffect, useRef } from 'react'
import { trackViewRoom, whenGtagReady } from '@/lib/analytics'

interface RoomViewTrackerProps {
  roomId: string
  roomName: string
  price?: number
}

export function RoomViewTracker({ roomId, roomName, price = 0 }: RoomViewTrackerProps) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    return whenGtagReady(() => {
      if (tracked.current) return
      tracked.current = true
      trackViewRoom({ roomId, roomName, price })
    })
  }, [roomId, roomName, price])

  return null
}
