import { beds24Request } from '@/app/api/auth';
import type { Beds24PropertyResponse, Beds24RoomType, ExtrasItem } from '@/types/beds24';
import dayjs from 'dayjs';

export async function getSingleRoomData(id: string, from?: string, to?: string ): Promise<Beds24RoomType | { error: string }> {
  try {
    const today = dayjs().format('YYYY-MM-DD')
    const nextYear = dayjs().add(365, 'day').format('YYYY-MM-DD')


    const details = await beds24Request<Beds24PropertyResponse>(`/properties?includeAllRooms=true&roomId=${id}&includeUpsellItems=true&includeTexts=all&includePictures=true`, 'GET');
    //here we want to get extras from the &includeUpsellItems=true, 
    const upsellItemNames = formatUpsellItems(details?.data?.[0].texts[0], details?.data?.[0].upsellItems);
    const room = details?.data?.[0]?.roomTypes?.[0];
    if (!room) {
      console.error('Room not found');
      return { error: 'Room not found' };
    }
    const startDate = from || today;
    let endDate = to || nextYear;
    

    if (dayjs(endDate).isBefore(dayjs(startDate))) {
      endDate = dayjs(startDate).add(1, 'day').format('YYYY-MM-DD');
    }
    
    if (dayjs(endDate).isSame(dayjs(startDate), 'day')) {
      endDate = dayjs(startDate).add(1, 'day').format('YYYY-MM-DD');
    }

    const unitsAvailableResponse = await beds24Request(`/inventory/rooms/unitBookings?propertyId=${room.propertyId}&roomId=${id}&startDate=${startDate}&endDate=${endDate}`, 'GET')
    const unitsAvailable = unitsAvailableResponse.data[0] ?? null;

    const formattedUnits = transformUnitBookings(unitsAvailable)
    const isNeedFilter = from && to
    const filteredUnits = isNeedFilter ? filterOnlyFullyFreeUnits(formattedUnits) : formattedUnits

  
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
      },
      extras: upsellItemNames.filter((extra) => extra.type !== 'notUsed'),
    } as Beds24RoomType;

    return roomDetails;
  } catch (error) {
    console.error('Error fetching single room data:', error);
    return { error: (error as Error).message };
  }
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

function formatUpsellItems(namesObj:Record<string, string>, items:ExtrasItem[]) {
  const names = Object.entries(namesObj)
    .filter(([key, value]) => key.startsWith("upsellItemName") && value.trim() !== "")
    .map(([key, value]) => {
      const index = Number(key.replace("upsellItemName", ""));
      return { index, name: value };
    });

  return items.map(item => {
    const found = names.find(n => n.index === item.index);
    return {
      ...item,
      name: found ? found.name : null
    };
  });
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