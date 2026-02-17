import { Fetch } from './Request';
import dayjs from 'dayjs';
import { cache } from 'react';
import { OfferResponse, RoomOffer } from '@/types/offers';
import { getRoomsDetails } from './getRoomsDetails';
import { CITY_TAX_RATE } from '@/lib/Constants';
const propId = process.env.APALEO_PROPERTY_ID;

type GetAvailableRoomsResult = RoomOffer[] | { error: string };

const getAvailableRoomsInternal = async (from?: string, to?: string, guests: number = 1): Promise<GetAvailableRoomsResult> => {
  if (!propId) {
    console.error('APALEO_PROPERTY_ID is not set in environment variables')
    return { error: 'Property ID is required. Set APALEO_PROPERTY_ID in .env' }
  }
  
  let arrival = from || dayjs().add(1, 'day').format('YYYY-MM-DD');
  let departure = to || dayjs().add(2, 'day').format('YYYY-MM-DD');
  
  // Validate that departure is at least 1 day after arrival
  if (arrival === departure) {
    departure = dayjs(arrival).add(1, 'day').format('YYYY-MM-DD');
  } else if (dayjs(departure).isBefore(dayjs(arrival))) {
    const temp = arrival;
    arrival = departure;
    departure = dayjs(temp).add(1, 'day').format('YYYY-MM-DD');
  }
  
  try {
    // Fetch all data in parallel
    const [singleRoomResponse, doubleRoomResponse, roomsDetails] = await Promise.all([
      Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&channelCode=Ibe&adults=1`).then(res => res.offers),
      Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&channelCode=Ibe&adults=2`)
        .then(res => res.offers)
        .catch((error) => {
          console.warn('Failed to fetch double room data:', error.message)
          return undefined
        }),
      getRoomsDetails()
    ]);

    if (!singleRoomResponse || singleRoomResponse.length === 0) {
      console.log('No rooms available for selected dates')
      return [];
    }

    // Format rooms with all available data
      const formattedRooms = singleRoomResponse.map(room => {
      const roomDetails = roomsDetails.find(item => item.id === room.unitGroup?.id);
      const doubleRoom = doubleRoomResponse?.find(
        dr => dr.unitGroup?.id === room.unitGroup?.id && dr.ratePlan?.id === room.ratePlan?.id
      );
      
      const roomPrice = room.totalGrossAmount?.amount || 0;
      const roomPriceForTwo = doubleRoom?.totalGrossAmount?.amount || 0;
      
      return {
        ...room,
        images: roomDetails?.photos || [],
        id: `${room.unitGroup?.id || ''}-${room.ratePlan?.id || ''}`,
        name: room.unitGroup?.name || 'Unknown Room',
        description: room.unitGroup?.description || '',
        price: roomPrice,
        priceForTwo: roomPriceForTwo,
        oneNightPrice: room.timeSlices?.[0]?.totalGrossAmount?.amount || 0,
        oneNightPriceForTwo: doubleRoom?.timeSlices?.[0]?.totalGrossAmount?.amount || 0,
        cityTax: room.cityTaxes?.[0]?.totalGrossAmount?.amount || Math.round(roomPrice * CITY_TAX_RATE * 100) / 100,
        cityTaxForTwo: doubleRoom?.cityTaxes?.[0]?.totalGrossAmount?.amount || Math.round(roomPriceForTwo * CITY_TAX_RATE * 100) / 100,
        currency: room.totalGrossAmount?.currency || 'EUR',
        attributes: roomDetails?.attributes || [],
        size: roomDetails?.size || 0,
        maxPersons: roomDetails?.max_persons || 1,
      };
      });

    // Filter rooms based on guest count
    const availableRooms = guests < 2 
      ? formattedRooms 
      : formattedRooms.filter(room => {
        const volume = room.maxPersons * room.availableUnits;
        return volume >= guests;
      });

      return availableRooms as RoomOffer[];
  } catch (e: any) {
    console.error('Get Rooms error:', e);
    console.error('Error details:', {
      message: e.message,
      stack: e.stack,
      arrival,
      departure,
      guests
    });
    
    // Return error object instead of empty array
    return { 
      error: e.message || 'Failed to fetch rooms. Please try again later.' 
    };
  }
};

export const getAvailableRooms = cache(getAvailableRoomsInternal);