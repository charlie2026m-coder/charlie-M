import { beds24Request } from '@/app/api/auth';
import type { Beds24RoomType } from '@/types/beds24';

export async function getSingleRoomData(id: string, from?: string, to?: string ): Promise<Beds24RoomType> {
  const details = await beds24Request(`/properties?includeAllRooms=true&roomId=${id}`, 'GET');
  const room = details?.data?.[0]?.roomTypes?.[0];

  const unitsAvailable = await beds24Request(`/inventory/rooms/unitBookings?propertyId=${details.propertyId}&roomId=${details.id}&startDate=${from}&endDate=${to}`, 'GET')
  const formattedUnits = transformUnitBookings(unitsAvailable)
  const filteredUnits = filterOnlyFullyFreeUnits(formattedUnits)
  
  const roomDetails =  {
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

      features: room?.featureCodes?.flat() || [],
      hasBalcony: room?.featureCodes?.flat()?.includes('BALCONY'),
      unitsAvailable: {
        total: unitsAvailable?.qty,
        free: Object.keys(filteredUnits).length,
        availability: filteredUnits,
      }
    } as Beds24RoomType;

  return roomDetails;
}

//we format the units data to comfortable for us format
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

//filter availability of units if we have selected date range to show only available units and quantity
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



const room = [
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
      total: 6,
      free: 6,
      availability: {
        1: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        2: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        3: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        4: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        5: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
        6: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true }
      }
    }
  },
]