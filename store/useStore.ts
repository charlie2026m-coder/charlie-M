import { create } from 'zustand'
import { DateRange } from 'react-day-picker';

interface Guests {
  adults: number;
  children: number;
}
export type MainFilter = 'balcony' | 'terrace' | 'shared' | undefined;
export type BedSizeFilter = 'king' | 'queen' | 'single' | undefined;
export type RoomTypeFilter = 'single' | 'standard' | 'business' | 'superior' | undefined;

interface StoreState {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  guests: Guests;

  priceFilter: boolean;
  filter: MainFilter;
  bedSizeFilter: BedSizeFilter;
  roomTypeFilter: RoomTypeFilter;
  childBedFilter: boolean;

  setValue: (
    value:string |number | DateRange | Guests | MainFilter | BedSizeFilter | RoomTypeFilter | boolean ,
    key: string
  ) => void;
  resetRoomsFilters: () => void;
}

const initialRoomsFilters = {
  filter: undefined,
  bedSizeFilter: undefined,
  priceFilter: false,
  roomTypeFilter: undefined,
  childBedFilter: false,
} satisfies Pick<
  StoreState,
  'filter' | 'bedSizeFilter' | 'priceFilter' | 'roomTypeFilter' | 'childBedFilter'
>;

export const useStore = create<StoreState>((set) => ({
  //room params
  dateRange: { from: undefined, to: undefined },
  guests: { adults: 1, children: 0 },

  //rooms filters
  ...initialRoomsFilters,

  setValue: (value, key) => set((state) => ({ ...state, [key]: value })),
  resetRoomsFilters: () => set(initialRoomsFilters),
}))

