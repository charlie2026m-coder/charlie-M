import { Fetch } from './Request';
import dayjs from 'dayjs';
import { cache } from 'react';
import { OfferResponse, RoomOffer } from '@/types/offers';
import { getRoomsDetails } from './getRoomsDetails';
import { CITY_TAX_RATE } from '@/lib/Constants';
import { roomTranslations } from '@/content/RoomTranslations';
const propId = process.env.APALEO_PROPERTY_ID;

type GetSingleRoomResult = RoomOffer[] | { error: string };

const getSingleRoomInternal = async (roomId: string, from?: string, to?: string, adults?: string, locale: string = 'en'): Promise<GetSingleRoomResult> => {
  if (!propId) throw new Error('Property ID is required. Set APALEO_PROPERTY_ID in .env');
  let arrival = from || dayjs().format('YYYY-MM-DD');
  let departure = to || dayjs().add(1, 'day').format('YYYY-MM-DD');
  
  // Validate that departure is at least 1 day after arrival
  if (arrival === departure) {
    departure = dayjs(arrival).add(1, 'day').format('YYYY-MM-DD');
  } else if (dayjs(departure).isBefore(dayjs(arrival))) {
    const temp = arrival;
    arrival = departure;
    departure = dayjs(temp).add(1, 'day').format('YYYY-MM-DD');
  }
  
  
  try {
    // Execute all requests in parallel using Promise.allSettled
    const [roomsDataResult, singleRoomResult, doubleRoomResult] = await Promise.allSettled([
      getRoomsDetails(),
      Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&unitGroupIds=${roomId}&channelCode=Ibe&adults=1`),
      Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&unitGroupIds=${roomId}&channelCode=Ibe&adults=2`)
    ]);

    // Handle roomsData
    let roomsData: Awaited<ReturnType<typeof getRoomsDetails>> = [];
    if (roomsDataResult.status === 'fulfilled') {
      roomsData = roomsDataResult.value;
    } else {
      console.warn('Failed to fetch rooms details:', roomsDataResult.reason);
    }

    // Handle single room response
    let singleRoomResponse: OfferResponse['offers'] = [];
    if (singleRoomResult.status === 'fulfilled') {
      singleRoomResponse = singleRoomResult.value.offers || [];
    } else {
      console.warn('Failed to fetch single room data:', singleRoomResult.reason);
    }

    if (!singleRoomResponse || singleRoomResponse.length === 0) {
      return [];
    }

    // Handle double room response
    let doubleRoomResponse: OfferResponse['offers'] | undefined;
    if (doubleRoomResult.status === 'fulfilled') {
      doubleRoomResponse = doubleRoomResult.value.offers;
    } else {
      console.warn('Failed to fetch double room data:', doubleRoomResult.reason);
    }
    
    console.log(singleRoomResponse, 'single ');
    console.log(doubleRoomResponse, 'double');

    const formattedRooms = singleRoomResponse.map(room => {
      const roomDetails = roomsData.find(item => item.id === room.unitGroup?.id);
      const doubleRoom = doubleRoomResponse?.find(
        dr => dr.unitGroup?.id === room.unitGroup?.id && dr.ratePlan?.id === room.ratePlan?.id
      );

      const roomPrice = room.totalGrossAmount?.amount || 0;
      const roomPriceForTwo = doubleRoom?.totalGrossAmount?.amount || 0;

      // Title & description: Supabase (roomDetails) → RoomTranslations → Apaleo
      const roomIdForTranslation = room.unitGroup?.id;
      const lang = locale === 'de' ? 'de' : 'en' as 'en' | 'de';
      const translation = roomIdForTranslation ? roomTranslations[roomIdForTranslation as keyof typeof roomTranslations] : null;
      const titleFromDb = lang === 'de' ? roomDetails?.title_de : roomDetails?.title_en;
      const descFromDb = lang === 'de' ? roomDetails?.description_de : roomDetails?.description_en;
      const translatedName = titleFromDb || translation?.title[lang] || room.unitGroup?.name || 'Unknown Room';
      const translatedDescription = descFromDb ?? translation?.description[lang] ?? room.unitGroup?.description ?? '';

      return {
        ...room,
        id: room.unitGroup?.id || '',
        name: translatedName || room.unitGroup?.name || 'Unknown Room',
        description: translatedDescription || room.unitGroup?.description || '',
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
        averagePrice: room.timeSlices?.[0]?.totalGrossAmount?.amount || 0,
      };
    });
      return formattedRooms as RoomOffer[];
  } catch (e: any) {
    // Return error object instead of empty array
    return { error: e.message || 'Failed to fetch rooms' };
  }
};

export const getSingleRoom = cache(getSingleRoomInternal);

