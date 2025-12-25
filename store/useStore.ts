import { create } from 'zustand'
import { DateRange } from 'react-day-picker';

interface Guests {
  adults: number;
  children: number;
}
export type MainFilter = 'balcony' | 'terrace' | 'shared' | undefined;
export type PriceFilter = 'Cheapest' | 'Expensive';
export type BedSizeFilter = 'king' | 'queen' | 'single' | undefined;

interface StoreState {
  dateRange: {
    from: undefined;
    to: undefined;
  };
  guests: Guests;

  priceFilter: PriceFilter;
  filter: MainFilter;
  bedSizeFilter: BedSizeFilter;

  bookingPage: number;

  setValue: (
    value:number | DateRange | Guests | MainFilter | PriceFilter | BedSizeFilter , 
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
  priceFilter: 'Cheapest',

  //booking steps
  bookingPage: 1,

  setValue: (value, key) => set((state) => ({ ...state, [key]: value })),
}))

