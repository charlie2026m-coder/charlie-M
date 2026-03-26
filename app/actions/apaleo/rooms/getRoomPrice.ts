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
  averagePrice: number
  averagePriceForTwo: number
  taxes: { vatTax: number; cityTax: number; cityTaxForTwo: number }
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

  console.log('🏨 [ROOM DATA]', JSON.stringify({ singleOffers, doubleOffers }, null, 2))

  const rooms: RoomPriceOffer[] = bestOffers.map(offer => {
    const doubleOffer = doubleOffers.find(
      d => d.unitGroup?.id === offer.unitGroup?.id && d.ratePlan?.id === offer.ratePlan?.id
    )
    const cityTax = offer.cityTaxes?.[0]?.totalGrossAmount?.amount ?? 0;
    const cityTaxForTwo = doubleOffer?.cityTaxes?.[0]?.totalGrossAmount?.amount ?? cityTax;

    const totalPrice = Math.round(((offer.totalGrossAmount?.amount ?? 0) + cityTax) * 100) / 100;
    const totalPriceForTwo = Math.round(((doubleOffer?.totalGrossAmount?.amount ?? offer.totalGrossAmount?.amount ?? 0) + cityTaxForTwo) * 100) / 100;

    const offerNights = offer.timeSlices?.length || 1;
    const doubleNights = doubleOffer?.timeSlices?.length || offerNights;

    return {
      ratePlan: {
        id: offer.ratePlan?.id || '',
        code: offer.ratePlan?.code || '',
        name: offer.ratePlan?.name || '',
      },
      availableUnits: offer.availableUnits ?? 1,
      maxPersons: offer.unitGroup?.maxPersons ?? maxPersons,
      oneNightPrice: Math.round((totalPrice / offerNights) * 100) / 100,
      oneNightPriceForTwo: Math.round((totalPriceForTwo / doubleNights) * 100) / 100,
      totalGrossAmount: { amount: totalPrice, currency: offer.totalGrossAmount?.currency ?? 'EUR' },
      averagePrice: Math.round((totalPrice / offerNights) * 100) / 100,
      averagePriceForTwo: Math.round((totalPriceForTwo / doubleNights) * 100) / 100,
      taxes: {
        vatTax: offer.taxDetails?.[0]?.tax?.amount ?? 0,
        cityTax,
        cityTaxForTwo,
      },
    }
  })

  return { rooms, babyBedAvailability }
}
