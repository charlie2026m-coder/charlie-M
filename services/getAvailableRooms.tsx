import { Fetch } from './Request';
import dayjs from 'dayjs';
import { cache } from 'react';
import { OfferResponse, RoomOffer } from '@/types/offers';
import { calculateNights } from '@/lib/utils';
import { getRoomsDetails } from './getRoomsDetails';
const propId = process.env.APALEO_PROPERTY_ID;


const getAvailableRoomsInternal = async (from?: string, to?: string, guests: number = 1) => {
  if (!propId) throw new Error('Property ID is required. Set APALEO_PROPERTY_ID in .env');
  
  const arrival = from || dayjs().format('YYYY-MM-DD');
  const departure = to || dayjs().add(1, 'day').format('YYYY-MM-DD');
  const guestsCount = (guests && guests > 1) ? 2 : 1;

  try {
      const response = await Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&channelCode=Direct&adults=${guestsCount}`).then(res => res.offers);
      
      //availableUnits
      const nights = calculateNights(from as string, to as string);
      const type = nights > 7  ? 'LONG_STAY' : 'BAR_WEB';

      const fillteredRooms = response.filter(room => {
        return room.ratePlan.code.includes(type);
      });
      const roomsDetails = await getRoomsDetails();

      const formattedRooms = fillteredRooms.map(room => {
        const roomDetails = roomsDetails.find(item => item.id === room.unitGroup.id);

        return {
          ...room,
          images: roomDetails?.photos || [],
          id: room.unitGroup.id,
          name: room.unitGroup.name,
          description: room.unitGroup.description,
          price: room.totalGrossAmount.amount,
          currency: room.totalGrossAmount.currency,
          attributes: roomDetails?.attributes || [],
          size: roomDetails?.size || 0,
          maxPersons: roomDetails?.max_persons || 1,
        };
      });
      const availableRooms = guests < 2 ? formattedRooms : formattedRooms.filter(room => {
        const volume = room.maxPersons * room.availableUnits;
        return volume >= guests;
      });
      return availableRooms as RoomOffer[];
  } catch (e: any) {
    console.error('Get Rooms error:', e.message);
    // Return error object instead of empty array
    return { error: e.message || 'Failed to fetch rooms' };
  }
};

export const getAvailableRooms = cache(getAvailableRoomsInternal);