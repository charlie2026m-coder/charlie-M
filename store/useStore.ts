import { create } from 'zustand'
import { DateRange } from 'react-day-picker';
import type { ExtrasItem } from '@/types/beds24';

interface Guests {
  adults: number;
  children: number;
}
export type MainFilter = 'balcony' | 'terrace' | 'shared' | undefined;
export type PriceFilter = 'Cheapest' | 'Expensive';

interface StoreState {
  dateRange: {
    from: undefined;
    to: undefined;
  };
  guests: Guests;

  priceFilter: PriceFilter;
  filter: MainFilter;
  bedSizeFilter: string;

  bookingPage: number;

  setValue: (
    value: number | string | string[] | boolean | DateRange | Guests | ExtrasItem[] | MainFilter | PriceFilter , 
    key: string
  ) => void;
}

export const useStore = create<StoreState>((set) => ({
  //room params
  dateRange: { from: undefined, to: undefined },
  guests: { adults: 1, children: 0 },

  //rooms filters
  filter: undefined,
  bedSizeFilter: '90/200',
  priceFilter: 'Cheapest',

  //booking steps
  bookingPage: 1,

  setValue: (value, key) => set((state) => ({ ...state, [key]: value })),
}))

