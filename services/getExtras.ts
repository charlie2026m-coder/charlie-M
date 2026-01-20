import { Service, ServicesResponse, AvailabilityResponse } from '@/types/apaleo';
import { Fetch } from './Request';
import { cache } from 'react';
import dayjs from 'dayjs';

// Get all services/extras from Apaleo
const fetchExtras = async (from: string, to: string): Promise<Service[]> => {
  const propertyId = process.env.APALEO_PROPERTY_ID;

  if (!propertyId) {
    throw new Error('Property ID is required. Set APALEO_PROPERTY_ID in .env');
  }

  // Validate dates
  let arrival = from;
  let departure = to;
  
  if (arrival === departure) {
    departure = dayjs(arrival).add(1, 'day').format('YYYY-MM-DD');
  } else if (dayjs(departure).isBefore(dayjs(arrival))) {
    const temp = arrival;
    arrival = departure;
    departure = dayjs(temp).add(1, 'day').format('YYYY-MM-DD');
  }

  try {
    const response = await Fetch<ServicesResponse>(
      `/rateplan/v1/services?propertyId=${propertyId}`
    ).then(res => res.services.map(item =>{
      const unlimited = !item.availability.hasOwnProperty("quantity")

      return {
        id: item.id,
        name: item.name,
        description: item.description,
        pricingUnit: item.pricingUnit,
        price: item.defaultGrossPrice?.amount || 0,
        currency: item.defaultGrossPrice?.currency,
        pricingType: item.availability.mode,
        daysOfWeek: item.availability.daysOfWeek,
        availability: item.availability,
        unlimited: unlimited,
      }
    }));

    const availability = await Fetch<AvailabilityResponse>(
      `/availability/v1/services?propertyId=${propertyId}&from=${arrival}&to=${departure}`
    ).then(res => res.timeSlices)
    console.log(availability);

    // const formattedServices = response.map(item => {
    //   // const availabilityItem = availability.find(item => item.service.id === item.id)

    //   return {
    //     ...item,
    //   }
    // })

    // console.log(response, 'extras')

    return  response;
  } catch (error: any) {
    console.error('Failed to fetch extras:', error.message);
    return [];
  }
};

// Export cached version
export const getApaleoExtras = cache(fetchExtras);