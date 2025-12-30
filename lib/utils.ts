import { clsx, type ClassValue } from "clsx"
import dayjs from "dayjs"
import { twMerge } from "tailwind-merge"
import { v4 as uuidv4 } from 'uuid';
import { UrlParams } from "@/types/apaleo"
import { Room, RoomExtra } from "@/types/types"
import { RoomOffer } from "@/types/offers"

export function cn(...inputs: ClassValue[]) {return twMerge(clsx(inputs))}
export const getDate = (date: Date) => {return date?dayjs(date).format('YYYY-MM-DD'): undefined}

export const getPath = (params: {
    roomId?: string
    from?: string 
    to?: string
    adults?: string
    children?: string
  }) => {
  const searchParams = new URLSearchParams()

  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)
  if (params.adults) searchParams.set('adults', params.adults)
  if (params.children) searchParams.set('children', params.children)
  if (params.roomId) searchParams.set('roomId', params.roomId)

  const queryString = searchParams.toString()
  return queryString;
}

export const getPriceData = ({ params, room }: {params: UrlParams, room: RoomOffer}) => {
  let nights = 1;
  const guests = Number(params.adults || 1) + Number(params.children || 0);
  const roomsNeeded = Math.ceil(guests / room.maxPersons);
  if (params.from && params.to) {
    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);
    nights = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    if (nights === 0) nights = 1;
  }
  const r = roomsNeeded === 1 ? 'room' : 'rooms';
  const g = guests === 1 ? 'guest' : 'guests';
  const n = nights === 1 ? 'night' : 'nights';
  const priceText = `${guests} ${g}, ${nights} ${n}, ${roomsNeeded} ${r}`;
  const priceValue = roomsNeeded * nights * room.price;

  return {
    nightsText: `${nights} ${n}`,
    guestsText: `${guests} ${g}`,
    roomsNeededText: `${roomsNeeded} ${r}`,
    price: priceValue.toFixed(2),
    priceText,
    nights,
    roomsNeeded,
    guests,
  }
}


export function sortGuestsByRooms(
  adults: number,
  children: number,
  from: string,
  to: string
): Room[] {
  const rooms: Room[] = [];

  const pushRoom = (a: number, c: number) =>
    rooms.push({ id: uuidv4(), adults: a, children: c, from, to });

  // 1 взрослый + 1 ребёнок
  const mixed = Math.min(adults, children);
  for (let i = 0; i < mixed; i++) pushRoom(1, 1);

  adults -= mixed;
  children -= mixed;

  // по 2 взрослых
  while (adults >= 2) {
    pushRoom(2, 0);
    adults -= 2;
  }

  // по 2 детей (если вдруг)
  while (children >= 2) {
    pushRoom(0, 2);
    children -= 2;
  }

  // остатки
  if (adults || children) {
    pushRoom(adults, children);
  }

  return rooms;
}

export const getExtraPrice = (
  extra:  RoomExtra, 
  guests: number,
  nights: number,
  from: string,
  to: string
) => {
  const pricingUnit = extra.pricingUnit;
  const price = extra.price;
  const pricingType = extra.pricingType;
  const daysOfWeek = extra.daysOfWeek || [];

  const units: Record<string, number> = {
    "Person": guests,
    "Room": 1,
  }

  // If no days specified, service is available all days
  if (daysOfWeek.length === 0) {
    const types = {
      "Daily": nights,
      "Departure": 1,
      "Arrival": 1,
    }
    return units[pricingUnit] * types[pricingType] * price;
  }

  // Calculate applicable days based on pricing type
  let applicableDays = 0;

  if (pricingType === "Daily") {
    // Count nights where the day of week is in daysOfWeek
    const fromDate = new Date(from);
    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(fromDate);
      currentDate.setDate(fromDate.getDate() + i);
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      if (daysOfWeek.includes(dayName)) {
        applicableDays++;
      }
    }
  } else if (pricingType === "Arrival") {
    // Check if arrival day is in daysOfWeek
    const arrivalDate = new Date(from);
    const arrivalDay = arrivalDate.toLocaleDateString('en-US', { weekday: 'long' });
    applicableDays = daysOfWeek.includes(arrivalDay) ? 1 : 0;
  } else if (pricingType === "Departure") {
    // Check if departure day is in daysOfWeek
    const departureDate = new Date(to);
    const departureDay = departureDate.toLocaleDateString('en-US', { weekday: 'long' });
    applicableDays = daysOfWeek.includes(departureDay) ? 1 : 0;
  }

  return units[pricingUnit] * applicableDays * price;
}

export const extraTooltip = (extra: RoomExtra) => {
  const units = {
    "Person": 'per person',
    "Room": 'per room',
  }

  const types = {
    "Daily": 'daily',
    "Departure": 'once at departure',
    "Arrival": 'once at arrival',
  }
 return `${extra.name} charged ${types[extra.pricingType]} ${units[extra.pricingUnit]} `
}


export const calculateNights = (arrival: string, departure: string): number => {
  const checkIn = dayjs(arrival);
  const checkOut = dayjs(departure);
  const nights = checkOut.diff(checkIn, 'day');
  return nights <= 0 ? 1 : nights;
};


export const getPriceType = (arrival: string , departure: string, isNonRef?: boolean) => {
  const nights = calculateNights(arrival, departure);
  
  if(isNonRef) {
    return 'non_ref_web';
  }

  if(nights >= 7) {
    return 'long_stay_web';
  }

  return 'bar_web';
}

export const getType = (nights: number, isRefundable: boolean) => {
  if(nights > 7) {
    return 'LONG_STAY_WEB'
  }
  if(!isRefundable) {
    return 'NON_REF_WEB'
  }
  if(nights > 7 && !isRefundable) {
    return 'LONG_STAY_NON_REF_WEB'
  }
  return 'BAR_WEB'
}


export const formatReservations = (
  from: string, 
  to: string, 
  roomDetails: RoomOffer, 
  updatedRooms: Room[], 
) => {
  const timeSlices = roomDetails.timeSlices.map(slice => ({
    ratePlanId: roomDetails.ratePlan.id
  }))

  const reservations = updatedRooms.map(item =>{
    const childrenAges = item.children > 0 ? Array(item.children).fill(0) as number[] : undefined
    return {
      arrival: from,
      departure: to,
      adults: item.adults,
      channelCode: 'Direct' as const,
      guaranteeType: 'Prepayment' as const,
      timeSlices,
      services: item.extras?.map(extra => ({
        serviceId: extra.id
      })) || [],
      ...(childrenAges && { childrenAges }),
    }
  })

  return reservations;
}