import dayjs from 'dayjs';
import { beds24Request } from '@/app/api/auth';
import type { Beds24PropertiesResponse, Beds24RoomType } from '@/types/beds24';

export async function getRoomsData(from?: string | undefined, to?: string | undefined, adults?: string | undefined, children?: string | undefined): Promise<Beds24RoomType[]> {
  const today = dayjs().format('YYYY-MM-DD')
  const nextYear = dayjs().add(365, 'day').format('YYYY-MM-DD')
  //get all rooms with from proprty data
  const res = await beds24Request<Beds24PropertiesResponse>('/properties?includeAllRooms=true', 'GET');

  const properties = res?.data ?? [];
  const data= properties.flatMap((property) => property.roomTypes ?? [])

  //get available dates for each unit of room
  const availabilityResponses = await Promise.all(
    data.map((room) => {
      return beds24Request(
        `/inventory/rooms/unitBookings?propertyId=${room.propertyId}&roomId=${room.id}&startDate=${from || today}&endDate=${to || nextYear}`,
        'GET'
      );
    })
  );
  
  const rooms = data.map((room, index) => {
    //get available dates for each unit of room
    const unitsAvailable = availabilityResponses[index]?.data[0] ?? null;

    const flatFeatures = room?.featureCodes?.flat() || [];
    const hasBalcony = flatFeatures.includes('BALCONY');
    
    //we format the units data to comfortable for us format
    const formattedUnits = transformUnitBookings(unitsAvailable)
    const isNeedFilter = from && to


    //filter availability of units if we have selected date range to show only available units and quantity
    const filteredUnits = isNeedFilter ? filterOnlyFullyFreeUnits(formattedUnits) : formattedUnits

    return {
      id: room?.id,
      propertyId: room?.propertyId,
      name: room?.name,
      roomType: room?.roomType,
      minPrice: room?.minPrice,
      
      //amount of guests in thus type of room
      adults: room?.maxAdult,
      children: room?.maxChildren,
      people: room?.maxPeople,
      
      //amount of guests in all units, for filters by guests
      maxAdult: room?.maxAdult * Object.keys(filteredUnits).length,
      maxChildren: room?.maxChildren * Object.keys(filteredUnits).length,
      maxPeople: room?.maxPeople * Object.keys(filteredUnits).length,
      
      qty: room?.qty,
      roomSize: room?.roomSize,
      features: flatFeatures,
      hasBalcony: hasBalcony,
      unitsAvailable: {
        total: unitsAvailable?.qty,
        free: Object.keys(filteredUnits).length,
        availability: filteredUnits,
      }
    } as Beds24RoomType;
  });


  const adultsAmount = adults ? Number(adults) : 1;
  const childrenAmount = children ? Number(children) : 0;
  const filteredRooms = rooms.filter((room) => (room.maxAdult >= adultsAmount) && (room.maxChildren >= childrenAmount))

  return filteredRooms;
}

function transformUnitBookings(data: any) {
  if (!data || !data.unitBookings) return {};

  const qty = Number(data.qty);
  const dates = Object.keys(data.unitBookings);

  return Array.from({ length: qty }, (_, idx) => idx + 1).reduce((acc, unitId) => {
    acc[unitId] = dates.reduce((dateAcc, date) => {
      const bookedCount = data.unitBookings[date][unitId] ?? 0;
      dateAcc[date] = bookedCount === 0; // true = свободно
      return dateAcc;
    }, {} as Record<string, boolean>);
    return acc;
  }, {} as Record<number, Record<string, boolean>>);
}

function filterOnlyFullyFreeUnits(units: any) {
  const result: any = {};

  for (const unitId in units) {
    const dates = units[unitId];

    // Проверяем, что ВСЕ даты === true
    const allTrue = Object.values(dates).every(v => v === true);

    if (allTrue) {
      result[unitId] = dates;
    }
  }

  return result;
}



const rooms = [
  {
    adults: 2,
    children: 0,
    features: ["BALCONY"],
    hasBalcony: true,
    id: 612384,
    name: "Studio with queen size bed and balcony",
    roomType: "double",
    roomSize: 12,
    propertyId: 287404,
    qty: 6,
    total: 6,
    free: 6,
    maxAdult: 12,
    maxChildren: 0,
    maxPeople: 12,
    maxStay: 180,
    minStay: 1,
    minPrice: 40,
    rackRate: 0,
    people: 2,
    unitsAvailable: {
      bookings: {
        1: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        2: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        3: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        4: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        5: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        6: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true }
      }
    }
  },
  {
    adults: 1,
    children: 1,
    features: [],
    hasBalcony: false,
    id: 612385,
    name: "Single room with extra bed",
    roomType: "single",
    roomSize: 8,
    propertyId: 287404,
    qty: 4,
    total: 4,
    free: 4,
    maxAdult: 4,
    maxChildren: 4,
    maxPeople: 8,
    maxStay: 180,
    minStay: 1,
    minPrice: 30,
    rackRate: 0,
    people: 2,
    unitsAvailable: {
      bookings: {
        1: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        2: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        3: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        4: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true }
      }
    }
  },
  {
    adults: 4,
    children: 2,
    features: ["BALCONY", "KITCHEN"],
    hasBalcony: true,
    id: 612386,
    name: "Family apartment with kitchen",
    roomType: "apartment",
    roomSize: 25,
    propertyId: 287404,
    qty: 3,
    total: 3,
    free: 3,
    maxAdult: 12,
    maxChildren: 6,
    maxPeople: 18,
    maxStay: 180,
    minStay: 2,
    minPrice: 80,
    rackRate: 0,
    people: 6,
    unitsAvailable: {
      bookings: {
        1: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        2: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        3: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true }
      }
    }
  },
  {
    adults: 1,
    children: 0,
    features: [],
    hasBalcony: false,
    id: 612387,
    name: "Economy single room",
    roomType: "single",
    roomSize: 6,
    propertyId: 287404,
    qty: 8,
    total: 8,
    free: 8,
    maxAdult: 8,
    maxChildren: 0,
    maxPeople: 8,
    maxStay: 180,
    minStay: 1,
    minPrice: 25,
    rackRate: 0,
    people: 1,
    unitsAvailable: {
      bookings: {
        1: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        2: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        3: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        4: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        5: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        6: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        7: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        8: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true }
      }
    }
  },
  {
    adults: 3,
    children: 1,
    features: ["BALCONY"],
    hasBalcony: true,
    id: 612388,
    name: "Deluxe triple room with balcony",
    roomType: "triple",
    roomSize: 18,
    propertyId: 287404,
    qty: 2,
    total: 2,
    free: 2,
    maxAdult: 6,
    maxChildren: 2,
    maxPeople: 8,
    maxStay: 180,
    minStay: 1,
    minPrice: 65,
    rackRate: 0,
    people: 4,
    unitsAvailable: {
      bookings: {
        1: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        2: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true }
      }
    }
  },
  {
    adults: 2,
    children: 2,
    features: ["KITCHEN"],
    hasBalcony: false,
    id: 612389,
    name: "Family room with kitchenette",
    roomType: "family",
    roomSize: 20,
    propertyId: 287404,
    qty: 5,
    total: 5,
    free: 5,
    maxAdult: 10,
    maxChildren: 10,
    maxPeople: 20,
    maxStay: 180,
    minStay: 1,
    minPrice: 70,
    rackRate: 0,
    people: 4,
    unitsAvailable: {
      bookings: {
        1: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        2: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        3: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        4: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        5: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true }
      }
    }
  }
]