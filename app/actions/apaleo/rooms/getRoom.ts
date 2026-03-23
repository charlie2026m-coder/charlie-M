import { Fetch } from '@/services/Request';
import dayjs from 'dayjs';
import { cache } from 'react';
import { OfferResponse, RoomOffer } from '@/types/offers';
import { getRoomDetails } from '@/app/actions/supabase/rooms/getRoomDetails';
import { CITY_TAX_RATE } from '@/lib/Constants';
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

      const roomPrice = room.totalGrossAmount?.amount || 0;
      const roomPriceForTwo = doubleRoom?.totalGrossAmount?.amount || 0;

      const lang = locale === 'de' ? 'de' : 'en' as 'en' | 'de';
      const translation = room.unitGroup?.id ? roomTranslations[room.unitGroup.id as keyof typeof roomTranslations] : null;
      const titleFromDb = lang === 'de' ? roomDetails?.title_de : roomDetails?.title_en;
      const descFromDb = lang === 'de' ? roomDetails?.description_de : roomDetails?.description_en;

      const avgPrice = room.timeSlices && room.timeSlices.length > 0
        ? room.timeSlices.reduce((sum, s) => sum + (s.totalGrossAmount?.amount || 0), 0) / room.timeSlices.length
        : 0;
      const avgPriceForTwo = doubleRoom?.timeSlices && doubleRoom.timeSlices.length > 0
        ? doubleRoom.timeSlices.reduce((sum, s) => sum + (s.totalGrossAmount?.amount || 0), 0) / doubleRoom.timeSlices.length
        : 0;

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
        oneNightPrice: room.timeSlices?.[0]?.totalGrossAmount?.amount || 0,
        oneNightPriceForTwo: doubleRoom?.timeSlices?.[0]?.totalGrossAmount?.amount || 0,
        cityTax: room.cityTaxes?.[0]?.totalGrossAmount?.amount || Math.round(roomPrice * CITY_TAX_RATE * 100) / 100,
        cityTaxForTwo: doubleRoom?.cityTaxes?.[0]?.totalGrossAmount?.amount || Math.round(roomPriceForTwo * CITY_TAX_RATE * 100) / 100,
        averagePrice: avgPrice,
        averagePriceForTwo: avgPriceForTwo,
      };
    });

    return formattedRooms as RoomOffer[];
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to fetch rooms';
    return { error: message };
  }
}

export const getRoom = cache(getRoomInternal);
