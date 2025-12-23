import { apaleoRequest } from './ApaleoRequest';
import dayjs from 'dayjs';
import { ratePlanResponse, rateResponse, UnitGroupsResponse } from '@/types/apaleo';
import { cache } from 'react';
import { roomsDetails } from '@/content/RoomsDetails';
const propId = process.env.APALEO_PROPERTY_ID;

// Get all rate plans with prices (cached per request)
const getApaleoRoomPriceInternal = async (from: string, to: string) => {
  console.log('get prices')
  const today = from ? dayjs(from).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
  const tomorrow = to ? dayjs(to).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
  
  try {
    // Get all rate plans for the property
    const pricePlans = await apaleoRequest<ratePlanResponse>(`/rateplan/v1/rate-plans?propertyId=${propId}`)
      .then(res => res.ratePlans.map(item => ({
        id: item.id, 
        code: item.code, 
        unitGroupId: item.unitGroup.id
      })));

    // Get prices for each plan
    const plansWithPrices = await Promise.all(
      pricePlans.map(async (plan) => {
        const defaultPrice = {
          ...plan,
          priceFrom: 0,
          currency: 'EUR',
          highestPrice: 0,
        };

        try {
          console.log("API call")
          // Get rates for this plan
          const priceObject = await apaleoRequest<rateResponse>(`/rateplan/v1/rate-plans/${plan.id}/rates?from=${today}&to=${tomorrow}`)
            .then(item => item.rates)
            .then(items => items.map(rate => rate.price));
          if (priceObject.length === 0) return defaultPrice;

          return {
            ...plan,
            priceFrom: priceObject[0]?.amount,
            currency: priceObject[0]?.currency,
            highestPrice: Math.max(...priceObject.map(price => price.amount)),
          };
        } catch (error: any) {
          console.log(error, 'try catch error');
          return defaultPrice;
        }
      })
    );

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
  console.log('get rooms')
  if (!propId) throw new Error('Property ID is required. Set APALEO_PROPERTY_ID in .env');

  const today = from || dayjs().format('YYYY-MM-DD');
  const tomorrow = to || dayjs().add(1, 'day').format('YYYY-MM-DD');
  try {
      const unitGroups = await apaleoRequest<UnitGroupsResponse>(`/availability/v1/unit-groups?propertyId=${propId}&from=${today}&to=${tomorrow}`)
        .then(item => item.timeSlices[0].unitGroups);

      const getUnitPrices = await getApaleoRoomPrice(today, tomorrow);
      const rooms = unitGroups.map(item => {
        return {
          ...item.unitGroup,
          available: item.availableCount,
          maxPersons: roomsDetails.find(room => room.id === item.unitGroup.id)?.maxPersons || 1,
          attributes: roomsDetails.find(room => room.id === item.unitGroup.id)?.attributes || [],
          price: getUnitPrices.find(plan => plan.unitGroupId === item.unitGroup.id)?.priceFrom || 0,
          currency: getUnitPrices.find(plan => plan.unitGroupId === item.unitGroup.id)?.currency || 'EUR',
          highestPrice: getUnitPrices.find(plan => plan.unitGroupId === item.unitGroup.id)?.highestPrice || 0,
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