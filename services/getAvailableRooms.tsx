import { Fetch } from './Request';
import dayjs from 'dayjs';
import { cache } from 'react';
import { OfferResponse, RoomOffer } from '@/types/offers';
import { calculateNights } from '@/lib/utils';
import { roomsDetails } from '@/content/RoomsDetails';
const propId = process.env.APALEO_PROPERTY_ID;


const getAvailableRoomsInternal = async (from?: string, to?: string, guests?: number) => {
  if (!propId) throw new Error('Property ID is required. Set APALEO_PROPERTY_ID in .env');
  
  const arrival = from || dayjs().format('YYYY-MM-DD');
  const departure = to || dayjs().add(1, 'day').format('YYYY-MM-DD');
  try {
      const response = await Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&channelCode=Direct&adults=${guests}`).then(res => res.offers);

      const nights = calculateNights(from as string, to as string);
      const type = nights > 7  ? 'LONG_STAY' : 'BAR_WEB';

      const fillteredRooms = response.filter(room => {
        return room.ratePlan.code.includes(type);
      });

      const formattedRooms = fillteredRooms.map(room => {
        const roomDetails = roomsDetails.find(item => item.id === room.unitGroup.id);

        return {
          ...room,
          id: room.unitGroup.id,
          name: room.unitGroup.name,
          description: room.unitGroup.description,
          price: room.totalGrossAmount.amount,
          currency: room.totalGrossAmount.currency,
          attributes: roomDetails?.attributes || [],
          size: roomDetails?.size || 0,
          maxPersons: roomDetails?.maxPersons || 1,
        };
      });
      return formattedRooms as RoomOffer[];
  } catch (e: any) {
    console.error('Get Rooms error:', e.message);
    // Return error object instead of empty array
    return { error: e.message || 'Failed to fetch rooms' };
  }
};

export const getAvailableRooms = cache(getAvailableRoomsInternal);