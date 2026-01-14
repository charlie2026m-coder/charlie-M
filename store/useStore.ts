import { create } from 'zustand'
import { DateRange } from 'react-day-picker';

interface Guests {
  adults: number;
  children: number;
}
export type MainFilter = 'balcony' | 'terrace' | 'shared' | undefined;
export type BedSizeFilter = 'king' | 'queen' | 'single' | undefined;
export type RoomTypeFilter = 'single' | 'standart' | 'business' | 'superior' | undefined;

interface StoreState {
  dateRange: {
    from: undefined;
    to: undefined;
  };
  guests: Guests;

  priceFilter: boolean;
  filter: MainFilter;
  bedSizeFilter: BedSizeFilter;
  roomTypeFilter: RoomTypeFilter;
  childBedFilter: boolean;
  bookingPage: number;

  setValue: (
    value:string |number | DateRange | Guests | MainFilter | BedSizeFilter | RoomTypeFilter | boolean , 
    key: string
  ) => void;
}

export const useStore = create<StoreState>((set) => ({
  //room params
  dateRange: { from: undefined, to: undefined },
  guests: { adults: 1, children: 0 },

  //rooms filters
  filter: undefined,
  bedSizeFilter: undefined,
  priceFilter: false,
  roomTypeFilter: undefined,
  childBedFilter: false,
  //booking steps
  bookingPage: 1,

  setValue: (value, key) => set((state) => ({ ...state, [key]: value })),
}))

