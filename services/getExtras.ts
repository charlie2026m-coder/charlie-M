import { Service, ServicesResponse, AvailabilityResponse } from '@/types/apaleo';
import { Fetch } from './Request';
import { cache } from 'react';
import dayjs from 'dayjs';

export enum usageType {
  Once = "once",
  Room = "room",
  Person = "person",

}

const STATUSES = {
  "ADCLN": usageType.Room,
  "BAB": usageType.Room,
  "BRKF": usageType.Person,
  "ECI":  usageType.Once,
  "LCO":  usageType.Once,
  "PET":  usageType.Room,
  "PRK":  usageType.Room
}

// Get all services/extras from Apaleo
const fetchExtras = async (from?: string, to?: string): Promise<Service[]> => {
  const propertyId = process.env.APALEO_PROPERTY_ID;


  if (!propertyId) {
    throw new Error('Property ID is required. Set APALEO_PROPERTY_ID in .env');
  }

  // Validate dates
  let arrival = from || dayjs().add(1, 'day').format('YYYY-MM-DD');
  let departure = to || dayjs().add(2, 'day').format('YYYY-MM-DD');

  
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
        usageType: STATUSES[item.code as keyof typeof STATUSES],
      }
    }));

    const availability = await Fetch<AvailabilityResponse>(
      `/availability/v1/services?propertyId=${propertyId}&from=${arrival}&to=${departure}`
    ).then(res => res.timeSlices)
    const formattedServices = response.map(item => {
      const mode = item.availability.mode;
      const isParking = item.id === 'CMH-PRK' || item.id.includes('PRK');
      let isSoldOut = false;
      
      let minAvailable: number | undefined;
      
      if (isParking) {
        // For parking: check availability excluding first day (arrival)
        const availableTimeSlices = availability.slice(1);
        if (availableTimeSlices.length === 0) {
          isSoldOut = true;
          minAvailable = 0;
        } else {
          minAvailable = Math.min(...availableTimeSlices.map(timeSlice => {
            const service = timeSlice.services.find(service => service.service.id === item.id);
            return service?.availableCount || 0;
          }));
          isSoldOut = minAvailable < 1;
        }
      } else if(mode === 'Arrival') {
        isSoldOut = availability[0].services.find(service => service.service.id === item.id)?.availableCount === 0;
      } else if(mode === 'Departure') {
        isSoldOut = availability[availability.length - 1].services.find(service => service.service.id === item.id)?.availableCount === 0;
      } else if(mode === 'Daily') {
        const stayDays = availability.slice(0, -1);
        isSoldOut = stayDays.length > 0 && stayDays.every(timeSlice => timeSlice.services.find(service => service.service.id === item.id)?.availableCount === 0);
      }

      const timeSlices = availability.map(timeSlice => {
        const serviceData = timeSlice.services.find(service => service.service.id === item.id);
        return {
          serviceDate: timeSlice.from,
          soldCount: serviceData?.soldCount || 0,
          availableCount: serviceData?.availableCount || 0,
          quantity: serviceData?.quantity || 0,
          service: serviceData?.service || { id: item.id, name: item.name }
        }
      })

      return {
        ...item,
        timeSlices: timeSlices,
        isSoldOut: isSoldOut,
        minAvailable: minAvailable
      }
    })



    console.log('formattedServices', formattedServices);
    return  formattedServices as Service[];
  } catch (error: any) {
    console.error('Failed to fetch extras:', error.message);
    return [];
  }
};

// Export cached version
export const getApaleoExtras = cache(fetchExtras);
