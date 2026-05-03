import { clsx, type ClassValue } from "clsx"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import { twMerge } from "tailwind-merge"
import { v4 as uuidv4 } from 'uuid';
import { Room, RoomExtra } from "@/types/types"
import { RoomOffer } from "@/types/offers"
import { RATE_PLANS, HOTEL_INFO, getRatePlanByNights, getNonRefundableRatePlanByNights } from "./Constants";
import { getApaleoExtras } from '@/app/actions/apaleo/services/getExtras';
import { ReservationFilter } from '@/store/useProfile'
import { serviceTranslations } from '@/content/ServiceTranslations';

dayjs.extend(utc)
dayjs.extend(timezone)

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
export const getDate = (date: Date) => { return date ? dayjs(date).format('YYYY-MM-DD') : undefined }

const CUTOFF_HOUR = 17

const getBerlinHour = () =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', hour: 'numeric', hour12: false }).format(new Date()))

// Returns Berlin's current date as local midnight Date (timezone-safe for non-European clients)
const getBerlinToday = (): Date => {
  const berlinDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date())
  const [year, month, day] = berlinDateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Returns Berlin today if before 17:00 Berlin, Berlin tomorrow if at/after 17:00
export const getMinArrivalDate = (): Date => {
  const berlinToday = getBerlinToday()
  if (getBerlinHour() >= CUTOFF_HOUR) {
    const minDate = new Date(berlinToday)
    minDate.setDate(minDate.getDate() + 1)
    return minDate
  }
  return berlinToday
}

// Returns default arrival date string for services (YYYY-MM-DD)
export const getDefaultArrivalDate = (): string => {
  const berlinHour = getBerlinHour()
  if (berlinHour >= CUTOFF_HOUR) return dayjs().add(1, 'day').format('YYYY-MM-DD')
  return dayjs().format('YYYY-MM-DD')
}

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
  return searchParams.toString()
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

  if (validMaxPersons === 1) {
    while (remainingAdults > 0) { pushRoom(1, 0); remainingAdults--; }
    while (remainingChildren > 0 && remainingAdults > 0) { pushRoom(1, 1); remainingAdults--; remainingChildren--; }
    return rooms;
  }

  // Step 1: One room per child (each needs at least 1 adult)
  for (let i = 0; i < validChildren; i++) {
    pushRoom(1, 1);
    remainingAdults--;
  }

  // Step 2: Fill child rooms with more adults up to maxPersons
  for (let i = 0; i < validChildren && remainingAdults > 0; i++) {
    while (rooms[i].adults < validMaxPersons && remainingAdults > 0) {
      rooms[i].adults++;
      remainingAdults--;
    }
  }

  // Step 3: Additional rooms for remaining adults
  while (remainingAdults > 0) {
    const roomAdults = Math.min(remainingAdults, validMaxPersons);
    pushRoom(roomAdults, 0);
    remainingAdults -= roomAdults;
  }

  return rooms;
}

export const getExtraPrice = (
  extra: RoomExtra,
  guests: number,
  nights: number,
  from: string,
  to: string
) => {
  // Services with specific selected dates (e.g. cleaning) — calculate from those dates
  if (extra.selectedDates && extra.selectedDates.length > 0) {
    return extra.selectedDates.reduce((total, date) => total + (date.count * extra.price), 0);
  }

  const pricingUnit = extra.pricingUnit;
  const price = extra.price;
  const pricingType = extra.pricingType;
  const daysOfWeek = extra.daysOfWeek || [];

  const units: Record<string, number> = {
    "Person": guests,
    "Room": 1,
  }

  if (daysOfWeek.length === 0) {
    const types: Record<string, number> = {
      "Daily": nights,
      "Departure": 1,
      "Arrival": 1,
    }
    return units[pricingUnit] * types[pricingType] * price;
  }

  let applicableDays = 0;

  if (pricingType === "Daily") {
    const fromDate = new Date(from);
    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(fromDate);
      currentDate.setDate(fromDate.getDate() + i);
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      if (daysOfWeek.includes(dayName)) applicableDays++;
    }
  } else if (pricingType === "Arrival") {
    const arrivalDay = new Date(from).toLocaleDateString('en-US', { weekday: 'long' });
    applicableDays = daysOfWeek.includes(arrivalDay) ? 1 : 0;
  } else if (pricingType === "Departure") {
    const departureDay = new Date(to).toLocaleDateString('en-US', { weekday: 'long' });
    applicableDays = daysOfWeek.includes(departureDay) ? 1 : 0;
  }

  return units[pricingUnit] * applicableDays * price;
}

export const extraTooltip = (extra: RoomExtra) => {
  const units = { "Person": 'per person', "Room": 'per room' }
  const types = { "Daily": 'daily', "Departure": 'once at departure', "Arrival": 'once at arrival' }
  return `${extra.name} charged ${types[extra.pricingType]} ${units[extra.pricingUnit]} `
}


export const calculateNights = (arrival: string, departure: string): number => {
  const checkIn = dayjs(arrival).startOf('day');
  const checkOut = dayjs(departure).startOf('day');
  const nights = checkOut.diff(checkIn, 'day');
  return nights <= 0 ? 1 : nights;
};


export const calculateTotalTaxes = (
  rooms: { adults: number }[],
  taxes: { vatTax: number; cityTax: number; cityTaxForTwo: number },
  maxPersons: number,
): { vatTax: number; cityTax: number } => {
  const { vatTax, cityTax, cityTaxForTwo } = taxes
  const totalCityTax = rooms.reduce((acc, room) => {
    const a = room.adults
    if (a === 1) return acc + cityTax
    if (a % 2 === 0) return acc + Math.ceil(a / maxPersons) * cityTaxForTwo
    return acc + Math.floor(a / 2) * cityTaxForTwo + cityTax
  }, 0)
  const totalPhysicalRooms = rooms.reduce((acc, room) => {
    const a = room.adults
    if (a <= 1) return acc + 1
    if (a % 2 === 0) return acc + a / 2
    return acc + Math.floor(a / 2) + 1
  }, 0)
  return {
    vatTax: Math.round(vatTax * totalPhysicalRooms * 100) / 100,
    cityTax: Math.round(totalCityTax * 100) / 100,
  }
}

export const getPriceType = (arrival: string, departure: string, isNonRef?: boolean) => {
  const nights = calculateNights(arrival, departure);
  if (isNonRef) return 'non_ref_web';
  if (nights >= 7) return 'long_stay_web';
  return 'bar_web';
}

export const getType = (nights: number, isRefundable: boolean): string => {
  return isRefundable ? getRatePlanByNights(nights) : getNonRefundableRatePlanByNights(nights);
}

// Picks one non-refundable offer per unit group for the listing page so each
// room appears exactly once. The booking flow does NOT call this — it lets
// resolveRatePlan choose between NR and FLEX based on the user toggle on
// /booking/[id], so keeping all offers in that path is fine.
export const selectBestRoomOffers = <T extends { unitGroup?: { id?: string }; id?: string; ratePlan?: { code?: string }; totalGrossAmount?: { amount?: number } }>(
  rooms: T[],
  nights: number,
): T[] => {
  const targetNRPlan = getNonRefundableRatePlanByNights(nights);
  const roomsMap = new Map<string, T[]>();
  rooms.forEach(room => {
    const roomId = room.unitGroup?.id || room.id || '';
    if (!roomsMap.has(roomId)) roomsMap.set(roomId, []);
    roomsMap.get(roomId)!.push(room);
  });

  const bestOffers: T[] = [];
  roomsMap.forEach(offers => {
    const selectedNR =
      offers.find(o => o.ratePlan?.code === targetNRPlan)
      ?? offers.find(o => o.ratePlan?.code === RATE_PLANS.NR_WEB);
    if (selectedNR) bestOffers.push(selectedNR);
  });

  return bestOffers;
}


export const formatReservations = (
  from: string,
  to: string,
  roomDetails: RoomOffer,
  updatedRooms: Room[],
) => {
  if (!roomDetails || !roomDetails.timeSlices || !roomDetails.ratePlan) {
    console.error('Invalid roomDetails:', roomDetails)
    return { reservations: [], totalAmount: 0 }
  }

  const timeSlices = roomDetails.timeSlices.map(_ => ({ ratePlanId: roomDetails.ratePlan.id }))

  const maxPersons = roomDetails.maxPersons || 2
  const price = roomDetails.price || 0
  const priceForTwo = roomDetails.priceForTwo || price

  // price/priceForTwo already include city tax — never add it again
  const calculateRoomPrice = (adultsCount: number) => {
    const roomsNeeded = Math.ceil(adultsCount / maxPersons);
    if (adultsCount === 1) return price;
    if (adultsCount % 2 === 0) return roomsNeeded * priceForTwo;
    const doubleRooms = Math.floor(adultsCount / 2);
    return (doubleRooms * priceForTwo) + price;
  };

  const reservations = updatedRooms.map((item, index) => {
    const roomPrice = calculateRoomPrice(item.adults);
    const extrasTotalPrice = item.extras?.reduce((sum, extra) => sum + (extra.totalPrice || 0), 0) || 0;
    const reservationAmount = Math.round((roomPrice + extrasTotalPrice) * 100) / 100

    console.log(`📊 Reservation ${index + 1}: Room ${roomPrice}, Extras ${extrasTotalPrice}, Total ${reservationAmount}`);

    type ServiceWithDates = {
      serviceId: string;
      dates: { serviceDate: string; amount?: { amount: number; currency: string } }[];
    };
    type SimpleService = { serviceId: string };
    type FormattedService = ServiceWithDates | SimpleService;

    const hasEarlyCheckIn = item.extras?.some(extra => extra.id === 'CMH-ECI');
    const hasLateCheckOut = item.extras?.some(extra => extra.id === 'CMH-LCO');

    let allServices: FormattedService[] = [];
    if (item.extras && item.extras.length > 0) {
      allServices = item.extras
        .map((extra): FormattedService | null => {
          if (extra.selectedDates && extra.selectedDates.length > 0) {
            return {
              serviceId: extra.id,
              dates: extra.selectedDates.map(date => ({ serviceDate: date.serviceDate })),
            };
          }
          return { serviceId: extra.id };
        })
        .filter((s): s is FormattedService => s !== null);
    }

    const arrivalTime = hasEarlyCheckIn ? '13:00' : HOTEL_INFO.checkinTime;
    const arrivalDate = dayjs.tz(`${from} ${arrivalTime}`, 'Europe/Berlin').format();

    const departureTime = hasLateCheckOut ? '13:00' : HOTEL_INFO.checkoutTime;
    const departureDate = dayjs.tz(`${to} ${departureTime}`, 'Europe/Berlin').format();

    return {
      arrival: arrivalDate,
      departure: departureDate,
      adults: item.adults,
      channelCode: 'IBE' as const,
      guaranteeType: 'Prepayment' as const,
      timeSlices,
      services: allServices,
      prepaymentAmount: { amount: reservationAmount, currency: 'EUR' },
    }
  })

  const totalAmount = Math.round(reservations.reduce((sum, r) => sum + r.prepaymentAmount.amount, 0) * 100) / 100

  return { reservations, totalAmount };
}


export const getServiceTranslation = (serviceId: string, locale: string = 'en'): { name: string; description: string } | null => {
  const t = serviceTranslations[serviceId];
  if (!t) return null;
  const lang = locale === 'de' ? 'de' : 'en';
  return { name: t.title[lang], description: t.description[lang] };
};

export const getTranslatedServiceName = (serviceId: string, defaultName: string, locale: string = 'en'): string =>
  getServiceTranslation(serviceId, locale)?.name || defaultName;

export const getTranslatedServiceDescription = (serviceId: string, defaultDescription: string, locale: string = 'en'): string =>
  getServiceTranslation(serviceId, locale)?.description || defaultDescription;

export const getServiceAvailabilityById = async (
  from: string | undefined,
  to: string | undefined,
  serviceId: string,
  locale: string = 'en'
): Promise<{ isAvailable: boolean; count: number }> => {
  const extras = await getApaleoExtras(from, to, locale);
  const service = extras.find(extra => extra.id === serviceId);

  if (!service || service.isSoldOut || !service.timeSlices || service.timeSlices.length === 0) {
    return { isAvailable: false, count: 0 };
  }

  const stayDays = service.timeSlices.slice(0, -1);
  if (stayDays.length === 0) return { isAvailable: false, count: 0 };

  const minAvailableCount = Math.min(...stayDays.map(slice => slice.availableCount));
  return { isAvailable: minAvailableCount > 0, count: minAvailableCount };
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
