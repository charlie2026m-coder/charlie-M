import { Fetch } from './Request';
import dayjs from 'dayjs';
import { cache } from 'react';
import { OfferResponse, RoomOffer } from '@/types/offers';
import { getRoomsDetails } from './getRoomsDetails';
const propId = process.env.APALEO_PROPERTY_ID;


const getAvailableRoomsInternal = async (from?: string, to?: string, guests: number = 1) => {
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
      const singleRoomResponse = await Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&channelCode=Ibe&adults=1`).then(res => res.offers);
      
      // Always fetch double room data
      const doubleRoomResponse = await Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&channelCode=Ibe&adults=2`).then(res => res.offers);
      
      const roomsDetails = await getRoomsDetails();

      const formattedRooms = singleRoomResponse.map(room => {
        const roomDetails = roomsDetails.find(item => item.id === room.unitGroup.id);
        const doubleRoom = doubleRoomResponse.find(dr => dr.unitGroup.id === room.unitGroup.id && dr.ratePlan.id === room.ratePlan.id);
        
        return {
          ...room,
          images: roomDetails?.photos || [],
          id: `${room.unitGroup.id}-${room.ratePlan.id}`, // Unique ID combining unit group and rate plan
          name: room.unitGroup.name,
          description: room.unitGroup.description,
          price: room.totalGrossAmount.amount, // Price for 1 guest
          priceForTwo: doubleRoom?.totalGrossAmount.amount, // Price for 2 guests (only if guests > 1)
          oneNightPrice: room.timeSlices[0].totalGrossAmount.amount,
          oneNightPriceForTwo: doubleRoom?.timeSlices[0].totalGrossAmount.amount, // Only if guests > 1
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