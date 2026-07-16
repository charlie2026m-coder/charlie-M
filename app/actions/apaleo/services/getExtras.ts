import { cache } from 'react';
import dayjs from 'dayjs';
import { Service, ServicesResponse, AvailabilityResponse } from '@/types/apaleo';
import { Fetch } from '@/services/Request';
import { serviceTranslations } from '@/content/ServiceTranslations';
import { getServicesDetails } from '@/app/actions/supabase/services/getServicesDetails';
import { apaleoLog } from '@/lib/logger';

export enum usageType {
  Once = 'once',
  Room = 'room',
  Person = 'person',
}

const STATUSES: Record<string, usageType> = {
  ADCLN: usageType.Room,
  BAB: usageType.Room,
  BRKF: usageType.Person,
  BRKFG: usageType.Person,
  ECI: usageType.Once,
  LCO: usageType.Once,
  PET: usageType.Room,
  PRK: usageType.Room,
};

async function fetchExtras(from?: string, to?: string, locale: string = 'en'): Promise<Service[]> {
  const propertyId = process.env.APALEO_PROPERTY_ID;
  if (!propertyId) throw new Error('Property ID is required. Set APALEO_PROPERTY_ID in .env');

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

    const [response, availability, dbServices] = await Promise.all([
      Fetch<ServicesResponse>(`/rateplan/v1/services?propertyId=${propertyId}`).then(res =>
        res.services.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          pricingUnit: item.pricingUnit,
          price: item.defaultGrossPrice?.amount || 0,
          currency: item.defaultGrossPrice?.currency,
          pricingType: item.availability.mode,
          daysOfWeek: item.availability.daysOfWeek,
          availability: item.availability,
          unlimited: !Object.prototype.hasOwnProperty.call(item.availability, 'quantity'),
          usageType: STATUSES[item.code as keyof typeof STATUSES],
        }))
      ),
      Fetch<AvailabilityResponse>(
        `/availability/v1/services?propertyId=${propertyId}&from=${arrival}&to=${departure}`
      ).then(res => res.timeSlices),
      getServicesDetails(),
    ]);

    const lang = locale === 'de' ? 'de' : 'en';

    const formattedServices = response.map(item => {
      const mode = item.availability.mode;
      const isParking = item.id === 'CMH-PRK' || item.id.includes('PRK');
      let isSoldOut = false;
      let minAvailable: number | undefined;

      if (isParking) {
        const availableTimeSlices = availability.slice(1);
        if (availableTimeSlices.length === 0) {
          isSoldOut = true;
          minAvailable = 0;
        } else {
          minAvailable = Math.min(
            ...availableTimeSlices.map(timeSlice => {
              const service = timeSlice.services.find(s => s.service.id === item.id);
              return service?.availableCount || 0;
            })
          );
          isSoldOut = minAvailable < 1;
        }
      } else if (mode === 'Arrival') {
        isSoldOut = availability[0].services.find(s => s.service.id === item.id)?.availableCount === 0;
      } else if (mode === 'Departure') {
        isSoldOut = availability[availability.length - 1].services.find(s => s.service.id === item.id)?.availableCount === 0;
      } else if (mode === 'Daily') {
        const stayDays = availability.slice(0, -1);
        isSoldOut = stayDays.length > 0 && stayDays.every(
          timeSlice => timeSlice.services.find(s => s.service.id === item.id)?.availableCount === 0
        );
      }

      const db = dbServices.find(s => s.id === item.id);
      const staticT = serviceTranslations[item.id];
      const name = db
        ? lang === 'de' ? db.title_de : db.title_en
        : staticT?.title[lang] || item.name;
      const description = db
        ? (lang === 'de' ? db.description_de : db.description_en) ?? ''
        : staticT?.description[lang] || item.description || '';
      const imageUrl = db?.image_path
        ? `${supabaseUrl}/storage/v1/object/public/services/${db.image_path}`
        : undefined;

      const timeSlices = availability.map(timeSlice => {
        const serviceData = timeSlice.services.find(s => s.service.id === item.id);
        return {
          serviceDate: timeSlice.from,
          soldCount: serviceData?.soldCount || 0,
          availableCount: serviceData?.availableCount || 0,
          quantity: serviceData?.quantity || 0,
          service: serviceData?.service || { id: item.id, name },
        };
      });

      return { ...item, name, description, imageUrl, timeSlices, isSoldOut, minAvailable };
    });

    // TEMP diagnostic: dump per-service availability from Apaleo so we can see
    // why a service is sold out / has no add button on a given date.
    apaleoLog.info('extras availability', {
      arrival,
      departure,
      services: formattedServices.map(s => ({
        id: s.id,
        mode: s.availability?.mode,
        isSoldOut: s.isSoldOut,
        minAvailable: s.minAvailable,
        timeSlices: s.timeSlices.map(ts => ({
          date: ts.serviceDate,
          availableCount: ts.availableCount,
          soldCount: ts.soldCount,
          quantity: ts.quantity,
        })),
      })),
    });

    return formattedServices.filter(service => {
      const name = service.name?.toLowerCase() ?? '';
      const id = service.id?.toLowerCase() ?? '';
      return !name.includes('тест') && !name.includes('test') && !id.includes('test');
    }) as Service[];
  } catch (error) {
    console.error('Failed to fetch extras:', error instanceof Error ? error.message : error);
    return [];
  }
}

export const getApaleoExtras = cache(fetchExtras);
