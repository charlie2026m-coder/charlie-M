import { clsx, type ClassValue } from "clsx"
import dayjs from "dayjs"
import { twMerge } from "tailwind-merge"
import { v4 as uuidv4 } from 'uuid';
import { UrlParams } from "@/types/apaleo"
import { Room, RoomExtra } from "@/types/types"
import { RoomOffer } from "@/types/offers"
import { RATE_PLANS, CITY_TAX_RATE } from "./Constants";
import { getApaleoExtras } from "@/services/getExtras";
import { ReservationFilter } from '@/store/useProfile'

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
  const adults = Number(params.adults || 1);
  const children = Number(params.children || 0);
  const maxPersons = room.maxPersons || 2;

  const roomsForChildren = children;
  
  const minAdultsForChildren = children;
  const adultsAssignedToChildren = Math.min(adults, minAdultsForChildren);
  
  let remainingAdults = adults - adultsAssignedToChildren;
  
  const maxAdultsPerChildRoom = Math.min(maxPersons, 2); // Can't exceed room capacity
  const additionalAdultsCapacity = children * (maxAdultsPerChildRoom - 1);
  const additionalAdultsAssigned = Math.min(remainingAdults, additionalAdultsCapacity);
  remainingAdults -= additionalAdultsAssigned;
  
  const roomsForRemainingAdults = Math.ceil(remainingAdults / maxPersons);
  
  const roomsNeeded = roomsForChildren + roomsForRemainingAdults;
  
  if (params.from && params.to) {
    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);
    nights = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    if (nights === 0) nights = 1;
  }
  const r = roomsNeeded === 1 ? 'room' : 'rooms';
  const g = adults === 1 ? 'guest' : 'guests';
  const n = nights === 1 ? 'night' : 'nights';
  
  // Build price text with adults and children
  let priceText = `${adults} ${g}`;
  if (children > 0) {
    const c = children === 1 ? 'baby' : 'babies';
    priceText += ` + ${children} ${c}`;
  }
  priceText += `, ${nights} ${n}, ${roomsNeeded} ${r}`;
  
  const priceValue = roomsNeeded * nights * room.totalGrossAmount.amount;

  return {
    nightsText: `${nights} ${n}`,
    guestsText: `${adults} ${g}`,
    roomsNeededText: `${roomsNeeded} ${r}`,
    price: priceValue.toFixed(2),
    priceText,
    nights,
    roomsNeeded,
    guests: adults,
  }
}


export function sortGuestsByRooms(
  adults: number,
  children: number,
  from: string,
  to: string,
  maxPersons: number
): Room[] {
  const validAdults = Number.isNaN(adults) ? 1 : Math.max(1, adults)
  const validChildren = Number.isNaN(children) ? 0 : Math.max(0, children)
  const validMaxPersons = Number.isNaN(maxPersons) || maxPersons < 1 ? 2 : maxPersons
  
  const rooms: Room[] = [];
  let remainingAdults = validAdults;
  let remainingChildren = validChildren;

  const pushRoom = (a: number, c: number) =>
    rooms.push({ id: uuidv4(), adults: a, children: c, from, to });

  // Special case: Single occupancy rooms (maxPersons = 1)
  if (validMaxPersons === 1) {
    // Each adult gets their own room
    while (remainingAdults > 0) {
      pushRoom(1, 0);
      remainingAdults--;
    }
    // Each child gets their own room with one adult
    while (remainingChildren > 0 && remainingAdults > 0) {
      pushRoom(1, 1);
      remainingAdults--;
      remainingChildren--;
    }
    return rooms;
  }

  // Step 1: Create one room per child (children cannot be alone)
  // Each child room gets 1 adult minimum
  for (let i = 0; i < validChildren; i++) {
    pushRoom(1, 1); // 1 adult + 1 child
    remainingAdults--;
  }

  // Step 2: Fill remaining capacity in child rooms with more adults
  // maxPersons applies only to adults, children are additional
  for (let i = 0; i < validChildren && remainingAdults > 0; i++) {
    // Add more adults to this child's room up to maxPersons adults
    while (rooms[i].adults < validMaxPersons && remainingAdults > 0) {
      rooms[i].adults++;
      remainingAdults--;
    }
  }

  // Step 3: Create additional rooms for remaining adults
  while (remainingAdults > 0) {
    const roomAdults = Math.min(remainingAdults, validMaxPersons);
    pushRoom(roomAdults, 0);
    remainingAdults -= roomAdults;
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
  // For stays >= 7 nights
  if (nights >= 7) {
    return isRefundable ? RATE_PLANS.LONG_STAY : RATE_PLANS.NON_REFUNDABLE_LONG_STAY;
  }
  // For stays < 7 nights
  return isRefundable ? RATE_PLANS.STANDARD : RATE_PLANS.NON_REFUNDABLE;
}


export const formatReservations = (
  from: string, 
  to: string, 
  roomDetails: RoomOffer, 
  updatedRooms: Room[], 
) => {
  if (!roomDetails || !roomDetails.timeSlices || !roomDetails.ratePlan) {
    console.error('Invalid roomDetails:', roomDetails)
    return []
  }

  const timeSlices = roomDetails.timeSlices.map(_ => ({ ratePlanId: roomDetails.ratePlan.id }))

  const maxPersons = roomDetails.maxPersons || 2
  const price = roomDetails.price || 0
  const priceForTwo = roomDetails.priceForTwo || price
  const cityTax = roomDetails.cityTax || Math.round(price * CITY_TAX_RATE * 100) / 100
  const cityTaxForTwo = roomDetails.cityTaxForTwo || Math.round(priceForTwo * CITY_TAX_RATE * 100) / 100

  const calculateRoomPrice = (adultsCount: number) => {
    const roomsNeeded = Math.ceil(adultsCount / maxPersons);
    
    if (adultsCount === 1) {
      return price;
    } else if (adultsCount % 2 === 0) {
      return roomsNeeded * priceForTwo;
    } else {
      const doubleRooms = Math.floor(adultsCount / 2);
      return (doubleRooms * priceForTwo) + price;
    }
  };

  const calculateRoomTax = (adultsCount: number) => {
    const roomsNeeded = Math.ceil(adultsCount / maxPersons);
    
    if (adultsCount === 1) {
      return cityTax;
    } else if (adultsCount % 2 === 0) {
      return roomsNeeded * cityTaxForTwo;
    } else {
      const doubleRooms = Math.floor(adultsCount / 2);
      return (doubleRooms * cityTaxForTwo) + cityTax;
    }
  };

  const reservations = updatedRooms.map((item, index) => {
    const roomPrice = calculateRoomPrice(item.adults);
    const roomTax = calculateRoomTax(item.adults);
    
    let extrasPrice = 0;
    if (item.extras && item.extras.length > 0) {
      extrasPrice = item.extras.reduce((sum, extra) => {
        return sum + (extra.totalPrice || extra.price || 0);
      }, 0);
    }
    
    const reservationAmount = Math.round((roomPrice + roomTax + extrasPrice) * 100) / 100
    
    console.log(`📊 Reservation ${index + 1}: Room ${roomPrice}, Tax ${roomTax}, Extras ${extrasPrice}, Total ${reservationAmount}`);
    
    type ServiceWithDates = { 
      serviceId: string; 
      dates: { serviceDate: string }[] 
    };
    type SimpleService = { 
      serviceId: string;
    };
    type FormattedService = ServiceWithDates | SimpleService;
    
    let allServices: FormattedService[] = [];
    
    if (item.extras && item.extras.length > 0) {
      allServices = item.extras.map((extra): FormattedService => {
        if (extra.selectedDates && extra.selectedDates.length > 0) {
          return {
            serviceId: extra.id,
            dates: extra.selectedDates.map(date => ({
              serviceDate: date.serviceDate
            }))
          };
        }
        
        return {
          serviceId: extra.id
        };
      });
    }
    
    return {
      arrival: from,
      departure: to,
      adults: item.adults,
      channelCode: 'IBE' as const,
      guaranteeType: 'Prepayment' as const,
      timeSlices,
      services: allServices,
      prepaymentAmount: {
        amount: reservationAmount,
        currency: 'EUR'
      },
    }
  })

  return reservations;
}


export const getServiceAvailabilityById = async (
  from: string | undefined,
  to: string | undefined,
  serviceId: string
): Promise<{ isAvailable: boolean; count: number }> => {
  const extras = await getApaleoExtras(from, to);
  const service = extras.find(extra => extra.id === serviceId);
  
  if (!service || service.isSoldOut || !service.timeSlices || service.timeSlices.length === 0) {
    return { isAvailable: false, count: 0 };
  }
  
  const stayDays = service.timeSlices.slice(0, -1);
  if (stayDays.length === 0) {
    return { isAvailable: false, count: 0 };
  }
  
  const minAvailableCount = Math.min(...stayDays.map(slice => slice.availableCount));
  
  return {
    isAvailable: minAvailableCount > 0,
    count: minAvailableCount
  };
}



export const filterReservationsByStatus = (reservations: any[], filter: ReservationFilter) => {
  const filterToStatus: Record<string, string> = {
    'All': '',
    'Ongoing': 'InHouse',
    'Upcoming': 'Confirmed',
    'Completed': 'CheckedOut',
    'Canceled': 'Canceled',
  }

  if (filter === 'All') return reservations
  const targetStatus = filterToStatus[filter]
  return reservations.filter((reservation: any) => 
    targetStatus && reservation.status === targetStatus
  )
}