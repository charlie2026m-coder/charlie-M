import { Fetch } from './Request';
import dayjs from 'dayjs';
import { cache } from 'react';
import { OfferResponse, RoomOffer } from '@/types/offers';
import { roomsDetails } from '@/content/RoomsDetails';
const propId = process.env.APALEO_PROPERTY_ID;

const getSingleRoomInternal = async (roomId: string, from?: string, to?: string, guests?: number) => {
  if (!propId) throw new Error('Property ID is required. Set APALEO_PROPERTY_ID in .env');
  
  const arrival = from || dayjs().format('YYYY-MM-DD');
  const departure = to || dayjs().add(1, 'day').format('YYYY-MM-DD');
  const guestsCount = guests ?? 1;
  try {
      const response = await Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&unitGroupIds=${roomId}&channelCode=Direct&adults=${guestsCount}`).then(res => res.offers);
      const formattedRooms = response.map(room => {
        const roomDetails = roomsDetails.find(item => item.id === room.unitGroup.id);

        return {
          ...room,
          code: room.ratePlan.code,
          id: room.unitGroup.id,
          name: room.unitGroup.name,
          description: room.unitGroup.description,
          price: room.totalGrossAmount.amount,
          currency: room.totalGrossAmount.currency,
          attributes: roomDetails?.attributes || [],
          size: roomDetails?.size || 0,
          maxPersons: roomDetails?.maxPersons || 1,
          averagePrice: room.timeSlices.reduce((acc, slice) => acc + slice.baseAmount.grossAmount, 0) / room.timeSlices.length,
        };
      });
      
      return formattedRooms as RoomOffer[];
  } catch (e: any) {
    // Return error object instead of empty array
    return { error: e.message || 'Failed to fetch rooms' };
  }
};

export const getSingleRoom = cache(getSingleRoomInternal);