'use server';
import { Fetch } from '@/services/Request';
import { OfferResponse } from '@/types/offers';
import { selectBestRoomOffers } from '@/lib/utils';
import { calculateNights } from '@/lib/utils';
import dayjs from 'dayjs';

const propId = process.env.APALEO_PROPERTY_ID;

export type RoomPrice = {
  roomId: string;
  minNightPrice: number;
};

export async function getPrices(
  from?: string,
  to?: string,
  guests: number = 1,
  opts?: { throwOnError?: boolean },
): Promise<RoomPrice[]> {
  if (!propId) return [];
  if (!from || !to) return [];

  const arrival = from;
  let departure = to;

  if (arrival === departure) {
    departure = dayjs(arrival).add(1, 'day').format('YYYY-MM-DD');
  }

  try {
    const response = await Fetch<OfferResponse>(
      `/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&channelCode=Ibe&adults=${guests}`,
    );

    if (!response.offers || response.offers.length === 0) return [];

    const nights = calculateNights(arrival, departure);
    const bestOffers = selectBestRoomOffers(response.offers, nights);

    return bestOffers.map(room => {
      const cityTaxDates = room.cityTaxes?.[0]?.dates ?? [];
      const perNightPrices = (room.timeSlices ?? [])
        .map((s, i) => (s.totalGrossAmount?.amount ?? 0) + (cityTaxDates[i]?.amount?.grossAmount ?? 0))
        .filter(p => p > 0);

      const minNightPrice = perNightPrices.length > 0 ? Math.min(...perNightPrices) : 0;

      return {
        roomId: room.unitGroup?.id || '',
        minNightPrice,
      };
    });
  } catch (error) {
    console.error('getPrices error:', error);
    // Callers that need to tell a transient Apaleo failure apart from a
    // legitimately empty result (e.g. to retry) opt in via throwOnError;
    // everyone else keeps the historical fail-soft [] behavior.
    if (opts?.throwOnError) throw error;
    return [];
  }
}
