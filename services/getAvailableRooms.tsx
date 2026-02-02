import { Fetch } from './Request';
import dayjs from 'dayjs';
import { cache } from 'react';
import { OfferResponse, RoomOffer } from '@/types/offers';
import { getRoomsDetails } from './getRoomsDetails';
const propId = process.env.APALEO_PROPERTY_ID;


const getAvailableRoomsInternal = async (from?: string, to?: string, guests: number = 1) => {
  if (!propId) throw new Error('Property ID is required. Set APALEO_PROPERTY_ID in .env');
  
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
      const singleRoomResponse = await Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&channelCode=Ibe&adults=1`).then(res => res.offers);
      // Always fetch double room data
      const doubleRoomResponse = await Fetch<OfferResponse>(`/booking/v1/offers?propertyId=${propId}&arrival=${arrival}&departure=${departure}&channelCode=Ibe&adults=2`).then(res => res.offers).catch(() => undefined);
      if (!singleRoomResponse || singleRoomResponse.length === 0) {
        return { error: 'No rooms available for selected dates' };
      }

      const roomsDetails = await getRoomsDetails();

      const formattedRooms = singleRoomResponse.map(room => {
        const roomDetails = roomsDetails.find(item => item.id === room.unitGroup.id);
        const doubleRoom = doubleRoomResponse?.find(dr => dr.unitGroup.id === room.unitGroup.id && dr.ratePlan.id === room.ratePlan.id);
        
        return {
          ...room,
          images: roomDetails?.photos || [],
          id: `${room.unitGroup.id}-${room.ratePlan.id}`, // Unique ID combining unit group and rate plan
          name: room.unitGroup.name,
          description: room.unitGroup.description,
          price: room.totalGrossAmount.amount, // Price for 1 guest without tax
          priceForTwo: (doubleRoom?.totalGrossAmount?.amount || 0), // Price for 2 guests without tax
          oneNightPrice: (room.timeSlices?.[0]?.totalGrossAmount?.amount || 0),
          oneNightPriceForTwo: (doubleRoom?.timeSlices?.[0]?.totalGrossAmount?.amount || 0),
          cityTax: (room.cityTaxes?.[0]?.totalGrossAmount?.amount || 0), // City tax for 1 guest
          cityTaxForTwo: (doubleRoom?.cityTaxes?.[0]?.totalGrossAmount?.amount || 0), // City tax for 2 guests
          // price: room.totalGrossAmount.amount + (room.cityTaxes?.[0]?.totalGrossAmount?.amount || 0), // Price for 1 guest with taxes
          // priceForTwo: (doubleRoom?.totalGrossAmount?.amount || 0) + (doubleRoom?.cityTaxes?.[0]?.totalGrossAmount?.amount || 0), // Price for 2 guests with taxes
          // oneNightPrice: (room.timeSlices?.[0]?.totalGrossAmount?.amount || 0) + (room.cityTaxes?.[0]?.dates?.[0]?.amount?.grossAmount || 0),
          // oneNightPriceForTwo: (doubleRoom?.timeSlices?.[0]?.totalGrossAmount?.amount || 0) + (doubleRoom?.cityTaxes?.[0]?.dates?.[0]?.amount?.grossAmount || 0),
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