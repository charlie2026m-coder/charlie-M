'use server'
import { Fetch } from '@/services/Request'
import { OfferResponse } from '@/types/offers'
import { getServiceAvailabilityById, selectBestRoomOffers, calculateNights } from '@/lib/utils'
import { DOUBLE_OCCUPANCY_SURCHARGE_PER_NIGHT } from '@/lib/Constants'
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

  // Apaleo returns cityTaxes as an array — there can be multiple entries when
  // tax rules or rates change mid-stay, or for multiple tax categories. Sum
  // them all instead of trusting only the first slot. If the array is missing
  // or empty, fall back to the provided default (preserves the prior single→
  // double cascade when the double offer doesn't expose cityTaxes).
  const sumCityTaxes = (
    taxes: Array<{ totalGrossAmount?: { amount?: number } }> | undefined,
    fallback = 0,
  ) =>
    taxes && taxes.length > 0
      ? taxes.reduce((sum, t) => sum + (t?.totalGrossAmount?.amount ?? 0), 0)
      : fallback

  // Authoritative night count for the requested stay. Used as a safety fallback
  // when an offer's timeSlices array is missing or empty (Apaleo data glitch),
  // so we never end up dividing by 1 and labelling the full stay as a per-night
  // price.
  const queryNights = Math.max(1, dayjs(departure).diff(dayjs(arrival), 'day'))

  const rooms: RoomPriceOffer[] = bestOffers.map(offer => {
    const doubleOffer = doubleOffers.find(
      d => d.unitGroup?.id === offer.unitGroup?.id && d.ratePlan?.id === offer.ratePlan?.id
    )
    const offerMaxPersons = offer.unitGroup?.maxPersons ?? maxPersons

    const cityTax = sumCityTaxes(offer.cityTaxes)
    const totalPrice = Math.round(((offer.totalGrossAmount?.amount ?? 0) + cityTax) * 100) / 100

    const offerSlicesLen = offer.timeSlices?.length ?? 0
    const offerNights = offerSlicesLen > 0 ? offerSlicesLen : queryNights
    const averagePrice = Math.round((totalPrice / offerNights) * 100) / 100

    // Pick the right double-occupancy price by branch:
    //   1. Apaleo returned a matching adults=2 offer for this rate plan → use
    //      its data (most accurate).
    //   2. No matching offer but the room itself fits two (maxPersons >= 2) →
    //      apply the hotel's documented surcharge so a transient Apaleo gap
    //      doesn't cost us the booking.
    //   3. Room is physically single-occupancy (maxPersons === 1) → no
    //      surcharge: two adults cannot share this room. averagePriceForTwo
    //      mirrors averagePrice for type cleanliness; BookingForm's capacity
    //      check is what actually blocks the booking when a pair tries to
    //      take a 1-person unit.
    let averagePriceForTwo: number
    let cityTaxForTwo = cityTax
    if (doubleOffer) {
      cityTaxForTwo = sumCityTaxes(doubleOffer.cityTaxes, cityTax)
      const doubleSlicesLen = doubleOffer.timeSlices?.length ?? 0
      const doubleNights = doubleSlicesLen > 0 ? doubleSlicesLen : queryNights
      const totalPriceForTwo = Math.round(((doubleOffer.totalGrossAmount?.amount ?? 0) + cityTaxForTwo) * 100) / 100
      averagePriceForTwo = Math.round((totalPriceForTwo / doubleNights) * 100) / 100
    } else if (offerMaxPersons >= 2) {
      averagePriceForTwo = Math.round((averagePrice + DOUBLE_OCCUPANCY_SURCHARGE_PER_NIGHT) * 100) / 100
    } else {
      averagePriceForTwo = averagePrice
    }

    return {
      ratePlan: {
        id: offer.ratePlan?.id || '',
        code: offer.ratePlan?.code || '',
        name: offer.ratePlan?.name || '',
      },
      availableUnits: offer.availableUnits ?? 1,
      maxPersons: offerMaxPersons,
      oneNightPrice: averagePrice,
      oneNightPriceForTwo: averagePriceForTwo,
      totalGrossAmount: { amount: totalPrice, currency: offer.totalGrossAmount?.currency ?? 'EUR' },
      averagePrice,
      averagePriceForTwo,
      taxes: {
        vatTax: offer.taxDetails?.[0]?.tax?.amount ?? 0,
        cityTax,
        cityTaxForTwo,
      },
    }
  })

  return { rooms, babyBedAvailability }
}
