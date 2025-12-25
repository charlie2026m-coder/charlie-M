import { Service, ServicesResponse } from '@/types/apaleo';
import { Fetch } from './Request';
import { cache } from 'react';

// Get all services/extras from Apaleo
const fetchExtras = async (propertyId?: string): Promise<Service[]> => {
  if (!propertyId) {
    propertyId = process.env.APALEO_PROPERTY_ID;
  }

  if (!propertyId) {
    throw new Error('Property ID is required. Set APALEO_PROPERTY_ID in .env');
  }

  try {
    const response = await Fetch<ServicesResponse>(
      `/rateplan/v1/services?propertyId=${propertyId}`
    ).then(res => res.services.map(item =>{
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        pricingUnit: item.pricingUnit,
        price: item.defaultGrossPrice?.amount || 0,
        currency: item.defaultGrossPrice?.currency,
        pricingType: item.availability.mode,
        daysOfWeek: item.availability.daysOfWeek,
      }
    }));

    return  response;
  } catch (error: any) {
    console.error('Failed to fetch extras:', error.message);
    return [];
  }
};

// Export cached version
export const getApaleoExtras = cache(fetchExtras);