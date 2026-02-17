import { Fetch } from './Request';
import dayjs from 'dayjs';
import { cache } from 'react';
import { OfferResponse, RoomOffer } from '@/types/offers';
import { getRoomsDetails } from './getRoomsDetails';
import { CITY_TAX_RATE } from '@/lib/Constants';
const propId = process.env.APALEO_PROPERTY_ID;

type GetSingleRoomResult = RoomOffer[] | { error: string };

const getSingleRoomInternal = async (roomId: string, from?: string, to?: string, adults?: string): Promise<GetSingleRoomResult> => {
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
    const roomsData = await getRoomsDetails();
    const singleRoomResponse = await Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&unitGroupIds=${roomId}&channelCode=Ibe&adults=1`).then(res => res.offers);

    if (!singleRoomResponse || singleRoomResponse.length === 0) {
      return [];
    }

    const doubleRoomResponse = await Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&unitGroupIds=${roomId}&channelCode=Ibe&adults=2`).then(res => res.offers).catch(() => undefined);
    
    console.log(singleRoomResponse, 'single ');
    console.log(doubleRoomResponse, 'double');

    const formattedRooms = singleRoomResponse.map(room => {
      const roomDetails = roomsData.find(item => item.id === room.unitGroup?.id);
      const doubleRoom = doubleRoomResponse?.find(
        dr => dr.unitGroup?.id === room.unitGroup?.id && dr.ratePlan?.id === room.ratePlan?.id
      );

      const roomPrice = room.totalGrossAmount?.amount || 0;
      const roomPriceForTwo = doubleRoom?.totalGrossAmount?.amount || 0;

      return {
        ...room,
        id: room.unitGroup?.id || '',
        name: room.unitGroup?.name || 'Unknown Room',
        description: room.unitGroup?.description || '',
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

