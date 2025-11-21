import { clsx, type ClassValue } from "clsx"
import dayjs from "dayjs"
import { twMerge } from "tailwind-merge"
import { Beds24RoomType, ExtrasItem, UrlParams } from "@/types/beds24"
import imageCompression from 'browser-image-compression';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const getDate = (date: Date) => {
  return date?dayjs(date).format('YYYY-MM-DD'): undefined
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

  const queryString = searchParams.toString()
  return queryString;
}

export const getPriceData = ({
params,
room,
}: {
  params: UrlParams
  room: Beds24RoomType
}) => {
  let nights = 1;
  const guests = Number(params.adults || 1) + Number(params.children || 0);
  const roomsNeeded = Math.ceil(guests / room.people);
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
  const priceValue = roomsNeeded * nights * room.minPrice;

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
  maxAdults: number,
  maxChildren: number,
  adults: number,
  children: number
) {
  const rooms: { id: number; adults: number; children: number }[] = [];
  let remainingAdults = adults;
  let remainingChildren = children;
  let id = 1;
  while (remainingAdults > 0 || remainingChildren > 0) {
    const roomAdults = Math.min(maxAdults, remainingAdults);
    const roomChildren = maxChildren > 0 ? Math.min(maxChildren, remainingChildren) : 0;

    rooms.push({
      id: id++,
      adults: roomAdults,
      children: roomChildren
    });

    remainingAdults -= roomAdults;
    remainingChildren -= roomChildren;
  }

  return rooms;
}

export const getExtrasPrice = (
  extra: ExtrasItem, 
  roomsQty: number, 
  guests: { adults: number, children: number }, 
  nights: number
) => {
  const per = extra.per
  const period = extra.period
  const amount = extra.amount

  const perType: Record<string, number> = {
    "booking": 1,
    "room": roomsQty,
    "person": guests.adults + guests.children,
    "adult": guests.adults,
    "child": guests.children,
  }

  const periodType = {
    "oneTime": 1,
    "daily": nights,
    "dailyPlusOne": nights + 1,
    "weekly": nights / 7,
    "refundable": 1,
  }

  return amount * perType[per] * periodType[period]
}

//here we get the texts for the period of extras payment
export const getPeriodText = (extra: ExtrasItem, nights: number) =>{
  const PeriodLabels = {
    "oneTime": 'One Time',
    "daily": nights === 1 ? `${nights} Night` : `${nights} Nights`,
    "dailyPlusOne": nights === 1 ? `${nights + 1} Night` : `${nights + 1} Nights`,
    "weekly": nights < 7 ? `Once` : `${nights / 7} Weeks`,
    "refundable": "Refundable"
  }
  return  PeriodLabels[extra.period]
}

//here we get the texts for the type of extras payment 
export const getPerText = (extra: ExtrasItem, roomsQty: number, guests: { adults: number, children: number },) =>{
  const PerLabels = {
    "booking": 'Booking',
    "room": roomsQty === 1 ? `Room` : `${roomsQty} Rooms`,
    "person": guests.adults + guests.children === 1 ? `Guest` : `${guests.adults + guests.children} Guests`,
    "adult": guests.adults === 1 ? `Guest` : `${guests.adults} Guests`,
    "child": guests.children === 1 ? `Child` : `${guests.children} Children`,
  }
  return PerLabels[extra.per]
}


export async function resizeImage(file: File) {
  const options = {
    maxSizeMB: 0.4,      // до ~200 KB
    maxWidthOrHeight: 512,
    useWebWorker: true
  };

  const compressedFile = await imageCompression(file, options);
  return compressedFile;
}