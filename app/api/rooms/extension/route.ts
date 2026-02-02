import { NextRequest, NextResponse } from 'next/server'
import { getSingleRoom } from '@/services/getSingleRoom'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const roomId = searchParams.get('roomId')

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to dates are required' }, { status: 400 })
    }

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 })
    }

    const room = await getSingleRoom(roomId, from, to, '1')

    if ('error' in room) {
      return NextResponse.json({ availableUnits: 0 })
    }

    if (!Array.isArray(room) || room.length === 0) {
      return NextResponse.json({ availableUnits: 0 })
    }

    const firstRoom = room[0]
    const availableUnits = firstRoom.availableUnits || 0

    return NextResponse.json({ availableUnits })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch room' }, { status: 500 })
  }
}
