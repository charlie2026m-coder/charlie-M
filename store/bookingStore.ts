import { create } from 'zustand'
import { Beds24RoomType } from '@/types/beds24'
import { DateRange } from 'react-day-picker';

interface Guests {
  adults: number;
  children: number;
}
interface Booking {
  roomId: string | number;
  from: string;
  to: string;
  adults: number;
  children: number;

}


interface BookingState {
  dateRange: DateRange | undefined;
  guests: Guests;

  categoryFilter: string[];
  balconyFilter: boolean;
  bedSizeFilter: string;
  sortByFilter: 'Price' | 'Size';
  // bookings: [],
  // roomId: string | number | null;
  // from: string | null;
  // to: string | null;
  // adults: number;
  // children: number;
  // isRefunable?: boolean;

  sevValue: (
    value: number | string | string[] | boolean | DateRange | Guests, 
    key: string
  ) => void;

}

export const useBookingStore = create<BookingState>((set) => ({
  dateRange: undefined,
  guests: { adults: 1, children: 0 },

  categoryFilter: [],
  balconyFilter: false,
  bedSizeFilter: '90/200',
  sortByFilter: 'Price',
  sevValue: (value, key) => set((state) => ({ ...state, [key]: value })),



}))

