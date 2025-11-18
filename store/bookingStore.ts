import { create } from 'zustand'
import { DateRange } from 'react-day-picker';
import type { ExtrasItem } from '@/types/beds24';

interface Guests {
  adults: number;
  children: number;
}

interface RoomDetails {
  id: number;
  adults: number;
  children: number;
}

interface BookingExtrasItem extends ExtrasItem {
  fullPrice?: {
    totalPrice: number;
    periodQty: number;
    periodText: string;
    perQty: number;
    perText: string;
  } | undefined;
}
export interface Booking {
  name: string | undefined;
  price: number;
  nights: number;
  isRefunable: boolean;
  roomsAmount: number;
  rooms: RoomDetails[];
  extras: BookingExtrasItem[];
  guests: Guests;
  totalPrice: number;

  withoutAccount: boolean;



  roomId: string | number | undefined;
  status: 'confirmed' | 'request' | 'new' | 'cancelled' | 'black' | 'inquiry' ;
  arrival: string | Date | undefined;      
  departure: string | Date | undefined;    
  numAdult: number;
  numChild: number;
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: number | string; 
  address: string;
  city: string;
  state: string;
  postcode: string | number;
  country: string;
}


interface BookingState {
  dateRange: {
    from: undefined;
    to: undefined;
  };
  guests: Guests;
  
  categoryFilter: string[];
  balconyFilter: boolean;
  bedSizeFilter: string;
  sortByFilter: 'Price' | 'Size';


  bookingPage: number;

  booking: Booking;

  setValue: (
    value: number | string | string[] | boolean | DateRange | Guests | ExtrasItem[], 
    key: string
  ) => void;

  setBooking: (booking: Booking | ((prev: Booking) => Booking)) => void;

}

export const useBookingStore = create<BookingState>((set) => ({
  dateRange: {
    from: undefined,
    to: undefined,
  },
  guests: { adults: 1, children: 0 },

  categoryFilter: [],
  balconyFilter: false,
  bedSizeFilter: '90/200',
  sortByFilter: 'Price',
  
  bookingPage: 3,
  
  //booking process store
  booking: {
    //booking process store
    withoutAccount: false,

    //booking data store
    name: undefined,
    price: 0,
    nights: 0,
    isRefunable: false,
    roomsAmount: 0,
    rooms: [],
    extras:[],
    guests: { adults: 1, children: 0 },
    totalPrice: 0,

    //booking data store
    roomId: undefined,
    status: 'new',
    arrival: undefined,
    departure: undefined,
    numAdult: 0,
    numChild: 0,
    title: '',
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    country: '',
  },
  setValue: (value, key) => set((state) => ({ ...state, [key]: value })),

  setBooking: (booking) => set((state) => ({ 
    ...state, 
    booking: typeof booking === 'function' ? booking(state.booking) : booking
  })),

}))

