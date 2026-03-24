'use server'
import { Fetch } from '@/services/Request'
import { OfferResponse } from '@/types/offers'
import { getServiceAvailabilityById, selectBestRoomOffers, calculateNights } from '@/lib/utils'
import dayjs from 'dayjs'

const propId = process.env.APALEO_PROPERTY_ID

export type RoomPriceOffer = {
  ratePlan: { id: string; code: string; name: string }
  availableUnits: number
  maxPersons: number
  oneNightPrice: number
  oneNightPriceForTwo: number
  totalGrossAmount: { amount: number; currency: string }
}

export type RoomPriceResult = {
  rooms: RoomPriceOffer[]
  babyBedAvailability: { isAvailable: boolean; count: number }
}

export async function getRoomPrice(
  roomId: string,
  from: string | undefined,
  to: string | undefined,
  maxPersons: number = 2,
): Promise<RoomPriceResult> {
  const empty: RoomPriceResult = { rooms: [], babyBedAvailability: { isAvailable: false, count: 0 } }

  if (!propId || !from || !to) return empty

  const arrival = from
  const departure = from === to ? dayjs(from).add(1, 'day').format('YYYY-MM-DD') : to

  const [singleResult, doubleResult, babyBedResult] = await Promise.allSettled([
    Fetch<OfferResponse>(
      `/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&unitGroupIds=${roomId}&channelCode=Ibe&adults=1`
    ),
    Fetch<OfferResponse>(
      `/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&unitGroupIds=${roomId}&channelCode=Ibe&adults=2`
    ),
    getServiceAvailabilityById(from, to, 'CMH-BAB'),
  ])

  const babyBedAvailability = babyBedResult.status === 'fulfilled'
    ? babyBedResult.value
    : { isAvailable: false, count: 0 }

  const singleOffers = singleResult.status === 'fulfilled' ? singleResult.value.offers || [] : []
  const doubleOffers = doubleResult.status === 'fulfilled' ? doubleResult.value.offers || [] : []

  if (singleOffers.length === 0) return { rooms: [], babyBedAvailability }

  const nights = calculateNights(arrival, departure)
  const bestOffers = selectBestRoomOffers(singleOffers, nights)

  const rooms: RoomPriceOffer[] = bestOffers.map(offer => {
    const doubleOffer = doubleOffers.find(
      d => d.unitGroup?.id === offer.unitGroup?.id && d.ratePlan?.id === offer.ratePlan?.id
    )
    return {
      ratePlan: {
        id: offer.ratePlan?.id || '',
        code: offer.ratePlan?.code || '',
        name: offer.ratePlan?.name || '',
      },
      availableUnits: offer.availableUnits ?? 1,
      maxPersons: offer.maxPersons ?? maxPersons,
      oneNightPrice: offer.timeSlices?.[0]?.totalGrossAmount?.amount ?? 0,
      oneNightPriceForTwo: doubleOffer?.timeSlices?.[0]?.totalGrossAmount?.amount ?? 0,
      totalGrossAmount: offer.totalGrossAmount ?? { amount: 0, currency: 'EUR' },
    }
  })

  return { rooms, babyBedAvailability }
}
