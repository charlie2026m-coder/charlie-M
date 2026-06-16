import { Fetch } from '@/services/Request';
import dayjs from 'dayjs';
import { cache } from 'react';
import { OfferResponse, RoomOffer } from '@/types/offers';
import { getRoomDetails } from '@/app/actions/supabase/rooms/getRoomDetails';
import { roomTranslations } from '@/content/RoomTranslations';

const propId = process.env.APALEO_PROPERTY_ID;

type GetSingleRoomResult = RoomOffer[] | { error: string };

async function getRoomInternal(
  roomId: string,
  from?: string,
  to?: string,
  adults?: string,
  locale: string = 'en'
): Promise<GetSingleRoomResult> {
  if (!propId) throw new Error('Property ID is required. Set APALEO_PROPERTY_ID in .env');

  let arrival = from || dayjs().format('YYYY-MM-DD');
  let departure = to || dayjs().add(1, 'day').format('YYYY-MM-DD');

  if (arrival === departure) {
    departure = dayjs(arrival).add(1, 'day').format('YYYY-MM-DD');
  } else if (dayjs(departure).isBefore(dayjs(arrival))) {
    const temp = arrival;
    arrival = departure;
    departure = dayjs(temp).add(1, 'day').format('YYYY-MM-DD');
  }

  try {
    const [roomsDataResult, singleRoomResult, doubleRoomResult] = await Promise.allSettled([
      getRoomDetails(),
      Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&unitGroupIds=${roomId}&channelCode=Ibe&adults=1`),
      Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&unitGroupIds=${roomId}&channelCode=Ibe&adults=2`),
    ]);

    const roomsData = roomsDataResult.status === 'fulfilled' ? roomsDataResult.value : [];
    if (roomsDataResult.status === 'rejected') {
      console.warn('Failed to fetch room details:', roomsDataResult.reason);
    }

    const singleRoomResponse = singleRoomResult.status === 'fulfilled'
      ? singleRoomResult.value.offers || []
      : [];
    if (singleRoomResult.status === 'rejected') {
      console.warn('Failed to fetch single room data:', singleRoomResult.reason);
    }

    if (!singleRoomResponse || singleRoomResponse.length === 0) return [];

    const doubleRoomResponse = doubleRoomResult.status === 'fulfilled'
      ? doubleRoomResult.value.offers
      : undefined;
    if (doubleRoomResult.status === 'rejected') {
      console.warn('Failed to fetch double room data:', doubleRoomResult.reason);
    }

    const formattedRooms = singleRoomResponse.map(room => {
      const roomDetails = roomsData.find(item => item.id === room.unitGroup?.id);
      const doubleRoom = doubleRoomResponse?.find(
        dr => dr.unitGroup?.id === room.unitGroup?.id && dr.ratePlan?.id === room.ratePlan?.id
      );

      // Sum ALL cityTaxes entries (multi-slice stays expose several) so this
      // matches getRoomPrice / getSingleRoom instead of dropping all but the first.
      const cityTax = (room.cityTaxes ?? []).reduce((sum, t) => sum + (t?.totalGrossAmount?.amount ?? 0), 0);
      const cityTaxForTwo = doubleRoom?.cityTaxes && doubleRoom.cityTaxes.length > 0
        ? doubleRoom.cityTaxes.reduce((sum, t) => sum + (t?.totalGrossAmount?.amount ?? 0), 0)
        : cityTax;

      const roomPrice = Math.round(((room.totalGrossAmount?.amount ?? 0) + cityTax) * 100) / 100;
      const roomPriceForTwo = Math.round(((doubleRoom?.totalGrossAmount?.amount ?? room.totalGrossAmount?.amount ?? 0) + cityTaxForTwo) * 100) / 100;

      const lang = locale === 'de' ? 'de' : 'en' as 'en' | 'de';
      const translation = room.unitGroup?.id ? roomTranslations[room.unitGroup.id as keyof typeof roomTranslations] : null;
      const titleFromDb = lang === 'de' ? roomDetails?.title_de : roomDetails?.title_en;
      const descFromDb = lang === 'de' ? roomDetails?.description_de : roomDetails?.description_en;

      const nights = room.timeSlices?.length || 1;
      const doubleNights = doubleRoom?.timeSlices?.length || nights;

      return {
        ...room,
        id: room.unitGroup?.id || '',
        name: titleFromDb || translation?.title[lang] || room.unitGroup?.name || 'Unknown Room',
        description: descFromDb ?? translation?.description[lang] ?? room.unitGroup?.description ?? '',
        attributes: roomDetails?.attributes || [],
        size: roomDetails?.size || 0,
        maxPersons: roomDetails?.max_persons || 1,
        images: roomDetails?.photos || [],
        price: roomPrice,
        priceForTwo: roomPriceForTwo,
        oneNightPrice: Math.round((roomPrice / nights) * 100) / 100,
        oneNightPriceForTwo: Math.round((roomPriceForTwo / doubleNights) * 100) / 100,
        averagePrice: Math.round((roomPrice / nights) * 100) / 100,
        averagePriceForTwo: Math.round((roomPriceForTwo / doubleNights) * 100) / 100,
        taxes: {
          vatTax: room.taxDetails?.[0]?.tax?.amount ?? 0,
          cityTax,
          cityTaxForTwo,
        },
      };
    });

    return formattedRooms as RoomOffer[];
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to fetch rooms';
    return { error: message };
  }
}

export const getRoom = cache(getRoomInternal);
