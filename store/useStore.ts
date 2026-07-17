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
  browseSorted: boolean;

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
  // Browse (no-dates) view only: false = keep the server's round-robin "waves"
  // order (every studio's nearest date, then next window, …). Flips true once
  // the guest actively picks a price sort. Ignored by the dated RoomsList.
  browseSorted: false,
} satisfies Pick<
  StoreState,
  'filter' | 'bedSizeFilter' | 'priceFilter' | 'roomTypeFilter' | 'childBedFilter' | 'browseSorted'
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

