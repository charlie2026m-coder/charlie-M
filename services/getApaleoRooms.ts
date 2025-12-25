import { Fetch } from './Request';
import dayjs from 'dayjs';
import { ratePlanResponse, rateResponse, UnitGroupsResponse } from '@/types/apaleo';
import { cache } from 'react';
import { roomsDetails } from '@/content/RoomsDetails';
const propId = process.env.APALEO_PROPERTY_ID;

// Get all rate plans with prices (cached per request)
const getApaleoRoomPriceInternal = async (from: string, to: string) => {
  const today = from ? dayjs(from).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
  const tomorrow = to ? dayjs(to).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
  
  try {
    // Get all rate plans for the property
    const pricePlans = await Fetch<ratePlanResponse>(`/rateplan/v1/rate-plans`)
    .then(res  => res.ratePlans.filter(item => item.code === 'BAR_WEB'))
      .then(res => res.map(item => ({
        id: item.id, 
        unitGroupId: item.unitGroup.id
      })));


    const plansWithPrices = await Promise.all(
      pricePlans.map(async (plan) => {
        const defaultPrice = { ...plan, price: 0 };

        try {
          const priceObject = await Fetch<rateResponse>(`/rateplan/v1/rate-plans/${plan.id}/rates?from=${today}&to=${tomorrow}`)
            .then(item => item.rates)
            .then(items => items.map(rate => rate.price));
          if (priceObject.length === 0) return defaultPrice;
          return {...plan,  price: priceObject[0]?.amount || 0 };
        } catch (error: any) {
          console.log(error, 'try catch error');
          return defaultPrice;
        }
      })
    );
    console.log(plansWithPrices, 'plansWithPrices');
    return plansWithPrices;

  } catch (error: any) {
    console.warn('Could not get rate plans:', error.message);
    return [];
  }
};

// Wrap with React cache to deduplicate requests within the same render
export const getApaleoRoomPrice = cache(getApaleoRoomPriceInternal);

// Get all rooms (cached per request)
const getApaleoRoomsInternal = async (from?: string, to?: string) => {
  if (!propId) throw new Error('Property ID is required. Set APALEO_PROPERTY_ID in .env');

  const today = from || dayjs().format('YYYY-MM-DD');
  const tomorrow = to || dayjs().add(1, 'day').format('YYYY-MM-DD');
  try {
      const unitGroups = await Fetch<UnitGroupsResponse>(`/availability/v1/unit-groups?propertyId=${propId}&from=${today}&to=${tomorrow}`)
        .then(item => item.timeSlices[0].unitGroups);

      const getUnitPrices = await getApaleoRoomPrice(today, tomorrow);
      
      const rooms = unitGroups.map(item => {
        return {
          ...item.unitGroup,
          maxPersons: roomsDetails.find(room => room.id === item.unitGroup.id)?.maxPersons || 1,
          attributes: roomsDetails.find(room => room.id === item.unitGroup.id)?.attributes || [],
          size: roomsDetails.find(room => room.id === item.unitGroup.id)?.size || 0,
          price: getUnitPrices.find(plan => plan.unitGroupId === item.unitGroup.id)?.price || 0,
        }
      })

  
    return rooms;
    // return [];
  } catch (e: any) {
    console.error('Get Rooms error:', e.message);
    // Return error object instead of empty array
    return { error: e.message || 'Failed to fetch rooms' };
  }
};

export const getApaleoRooms = cache(getApaleoRoomsInternal);