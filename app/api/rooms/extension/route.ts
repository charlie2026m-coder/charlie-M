import { NextRequest, NextResponse } from 'next/server'
import { getSingleRoom } from '@/services/getSingleRoom'
import { getServiceAvailabilityById } from '@/lib/utils'

interface ExtensionResponse {
  availableUnits: number
  babyBedAvailable?: boolean
  message?: string
}

interface ErrorResponse {
  error: string
}

export async function GET(request: NextRequest): Promise<NextResponse<ExtensionResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const roomId = searchParams.get('roomId')
    const isBaby = searchParams.get('isBaby') === 'true'

    if (!from || !to) return NextResponse.json({ error: 'from and to dates are required' }, { status: 400 })
    if (!roomId) return NextResponse.json({ error: 'roomId is required' }, { status: 400 })

    // Execute both checks in parallel
    // Note: API route doesn't have locale context, using 'en' as default
    const [room, babyBedAvailability] = await Promise.all([
      getSingleRoom(roomId, from, to, '1', 'en'),
      isBaby ? getServiceAvailabilityById(from, to, 'CMH-BAB') : Promise.resolve({ isAvailable: true, count: 0 })
    ])

    // Check if baby bed is not available
    if (isBaby && !babyBedAvailability.isAvailable) {
      return NextResponse.json({ 
        availableUnits: 0,
        babyBedAvailable: false,
        message: 'Baby bed is not available for the selected dates'
      })
    }

    // Check room availability - type guard for error
    if ('error' in room) {
      return NextResponse.json({ 
        availableUnits: 0,
        message: room.error 
      })
    }

    // room is now typed as RoomOffer[]
    if (room.length === 0) {
      return NextResponse.json({ 
        availableUnits: 0,
        message: 'No rooms available for selected dates' 
      })
    }

    const firstRoom = room[0]
    const availableUnits = firstRoom.availableUnits ?? 0

    return NextResponse.json({ 
      availableUnits,
      babyBedAvailable: isBaby ? babyBedAvailability.isAvailable : undefined
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch room' }, { status: 500 })
  }
}
