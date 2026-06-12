import { Fetch } from '@/services/Request';
import dayjs from 'dayjs';
import { cache } from 'react';
import { OfferResponse, RoomOffer } from '@/types/offers';
import { getRoomDetails } from '@/app/actions/supabase/rooms/getRoomDetails';
import { roomTranslations } from '@/content/RoomTranslations';

const propId = process.env.APALEO_PROPERTY_ID;

type GetRoomsResult = RoomOffer[] | { error: string };

async function getRoomsInternal(
  from?: string,
  to?: string,
  guests: number = 1,
  locale: string = 'en'
): Promise<GetRoomsResult> {
  if (!propId) {
    return { error: 'Property ID is required. Set APALEO_PROPERTY_ID in .env' };
  }

  let arrival = from || dayjs().add(1, 'day').format('YYYY-MM-DD');
  let departure = to || dayjs().add(2, 'day').format('YYYY-MM-DD');

  if (arrival === departure) {
    departure = dayjs(arrival).add(1, 'day').format('YYYY-MM-DD');
  } else if (dayjs(departure).isBefore(dayjs(arrival))) {
    const temp = arrival;
    arrival = departure;
    departure = dayjs(temp).add(1, 'day').format('YYYY-MM-DD');
  }

  try {
    const [singleRoomResponse, doubleRoomResponse, roomsDetails] = await Promise.all([
      Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&channelCode=Ibe&adults=1`).then(res => res.offers),
      Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&channelCode=Ibe&adults=2`)
        .then(res => res.offers)
        .catch((error) => {
          console.warn('Failed to fetch double room data:', error.message);
          return undefined;
        }),
      getRoomDetails(),
    ]);

    if (!singleRoomResponse || singleRoomResponse.length === 0) {
      return [];
    }

    const formattedRooms = singleRoomResponse.map(room => {
      const roomDetail = roomsDetails.find(item => item.id === room.unitGroup?.id);
      const doubleRoom = doubleRoomResponse?.find(
        dr => dr.unitGroup?.id === room.unitGroup?.id && dr.ratePlan?.id === room.ratePlan?.id
      );

      const cityTax = room.cityTaxes?.[0]?.totalGrossAmount?.amount ?? 0;
      const cityTaxForTwo = doubleRoom?.cityTaxes?.[0]?.totalGrossAmount?.amount ?? cityTax;

      const roomPrice = Math.round(((room.totalGrossAmount?.amount ?? 0) + cityTax) * 100) / 100;
      const roomPriceForTwo = Math.round(((doubleRoom?.totalGrossAmount?.amount ?? room.totalGrossAmount?.amount ?? 0) + cityTaxForTwo) * 100) / 100;

      const roomId = room.unitGroup?.id;
      const lang = locale === 'de' ? 'de' : 'en' as 'en' | 'de';
      const translation = roomId ? roomTranslations[roomId as keyof typeof roomTranslations] : null;
      const titleFromDb = lang === 'de' ? roomDetail?.title_de : roomDetail?.title_en;
      const descFromDb = lang === 'de' ? roomDetail?.description_de : roomDetail?.description_en;
      const translatedName = titleFromDb || translation?.title[lang] || room.unitGroup?.name || 'Unknown Room';
      const translatedDescription = descFromDb ?? translation?.description[lang] ?? room.unitGroup?.description ?? '';

      const nights = room.timeSlices?.length || 1;
      const doubleNights = doubleRoom?.timeSlices?.length || nights;

      return {
        ...room,
        images: roomDetail?.photos || [],
        id: room.unitGroup?.id || '',
        name: translatedName || room.unitGroup?.name || 'Unknown Room',
        description: translatedDescription || room.unitGroup?.description || '',
        price: roomPrice,
        priceForTwo: roomPriceForTwo,
        oneNightPrice: Math.round((roomPrice / nights) * 100) / 100,
        oneNightPriceForTwo: Math.round((roomPriceForTwo / doubleNights) * 100) / 100,
        averagePrice: Math.round((roomPrice / nights) * 100) / 100,
        averagePriceForTwo: Math.round((roomPriceForTwo / doubleNights) * 100) / 100,
        currency: room.totalGrossAmount?.currency || 'EUR',
        attributes: roomDetail?.attributes || [],
        size: roomDetail?.size || 0,
        maxPersons: roomDetail?.max_persons || 1,
        taxes: {
          vatTax: room.taxDetails?.[0]?.tax?.amount ?? 0,
          cityTax,
          cityTaxForTwo,
        },
      };
    });

    const availableRooms = formattedRooms.filter((room) => {
      if (room.availableUnits < 1) return false;
      if (guests < 2) return true;
      return room.maxPersons * room.availableUnits >= guests;
    });

    return availableRooms as RoomOffer[];
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to fetch rooms. Please try again later.';
    console.error('getRooms error:', e);
    return { error: message };
  }
}

export const getRooms = cache(getRoomsInternal);