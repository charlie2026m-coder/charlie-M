import { NextResponse } from "next/server"
import { getOrRefreshToken } from "@/services/Request"

const APALEO_API_URL = 'https://api.apaleo.com'

export async function POST(request: Request) {
  try {
    const booking = await request.json()

    // Get Apaleo token
    const token = await getOrRefreshToken()

    // Create booking in Apaleo
    const response = await fetch(`${APALEO_API_URL}/booking/v1/bookings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(booking),
    })


    console.log(response, 'XXX_RESPONSE')

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Apaleo API error:', response.status, errorData)
      
      return NextResponse.json(
        { 
          error: 'Failed to create booking',
          details: errorData,
          status: response.status
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 201 })
    
  } catch (error) {
    console.error('Create booking error:', error)
    
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' },{ status: 500 })
  }
}