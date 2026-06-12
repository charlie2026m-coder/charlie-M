import { Fetch } from './Request';
import dayjs from 'dayjs';
import { cache } from 'react';
import { OfferResponse, RoomOffer } from '@/types/offers';
import { getRoomDetails } from '@/app/actions/supabase/rooms/getRoomDetails';
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
      getRoomDetails(),
      Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&unitGroupIds=${roomId}&channelCode=Ibe&adults=1`),
      Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&unitGroupIds=${roomId}&channelCode=Ibe&adults=2`)
    ]);

    // Handle roomsData
    let roomsData: Awaited<ReturnType<typeof getRoomDetails>> = [];
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
    
    const formattedRooms = singleRoomResponse.map(room => {
      const roomDetails = roomsData.find(item => item.id === room.unitGroup?.id);
      const doubleRoom = doubleRoomResponse?.find(
        dr => dr.unitGroup?.id === room.unitGroup?.id && dr.ratePlan?.id === room.ratePlan?.id
      );

      // Sum ALL cityTaxes entries (there can be several for a multi-slice stay)
      // so the booking/charge matches the room-detail card (getRoomPrice), which
      // also sums them — otherwise the card and the booking page diverge.
      const cityTax = (room.cityTaxes ?? []).reduce((sum, t) => sum + (t?.totalGrossAmount?.amount ?? 0), 0);
      const cityTaxForTwo = doubleRoom?.cityTaxes && doubleRoom.cityTaxes.length > 0
        ? doubleRoom.cityTaxes.reduce((sum, t) => sum + (t?.totalGrossAmount?.amount ?? 0), 0)
        : cityTax;

      const roomPrice = Math.round(((room.totalGrossAmount?.amount ?? 0) + cityTax) * 100) / 100;
      const roomPriceForTwo = Math.round(((doubleRoom?.totalGrossAmount?.amount ?? room.totalGrossAmount?.amount ?? 0) + cityTaxForTwo) * 100) / 100;

      // Title & description: Supabase (roomDetails) → RoomTranslations → Apaleo
      const roomIdForTranslation = room.unitGroup?.id;
      const lang = locale === 'de' ? 'de' : 'en' as 'en' | 'de';
      const translation = roomIdForTranslation ? roomTranslations[roomIdForTranslation as keyof typeof roomTranslations] : null;
      const titleFromDb = lang === 'de' ? roomDetails?.title_de : roomDetails?.title_en;
      const descFromDb = lang === 'de' ? roomDetails?.description_de : roomDetails?.description_en;
      const translatedName = titleFromDb || translation?.title[lang] || room.unitGroup?.name || 'Unknown Room';
      const translatedDescription = descFromDb ?? translation?.description[lang] ?? room.unitGroup?.description ?? '';

      const nights = room.timeSlices?.length || 1;
      const doubleNights = doubleRoom?.timeSlices?.length || nights;

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
  } catch (e: any) {
    // Return error object instead of empty array
    return { error: e.message || 'Failed to fetch rooms' };
  }
};

export const getSingleRoom = cache(getSingleRoomInternal);

