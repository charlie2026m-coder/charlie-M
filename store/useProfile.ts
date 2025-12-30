import { create } from 'zustand'
import { Reservation } from '@/types/apaleo'
import { RoomDetails } from '@/services/getRoomsDetails'

export type ReservationFilter = 'All' | 'Ongoing' | 'Upcoming' | 'Completed' | 'Canceled'

interface ProfileState {
  reservations: Reservation[] | undefined
  totalCount: number
  currentPage: number
  roomDetails: RoomDetails[]
  reservationFilter: ReservationFilter
  
  setValue: (value: string | number | Reservation[] | RoomDetails[] | undefined, key: string) => void
  setReservations: (reservations: Reservation[]) => void
  addReservations: (reservations: Reservation[]) => void
  setTotalCount: (count: number) => void
  setCurrentPage: (page: number) => void
  setReservationFilter: (filter: ReservationFilter) => void
  resetReservations: () => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  reservations: undefined,
  totalCount: 0,
  currentPage: 1,
  roomDetails: [],
  reservationFilter: 'All',

  setValue: (value, key) => set((state) => ({ ...state, [key]: value })),
  
  setReservations: (reservations) => set({ reservations }),
  
  addReservations: (newReservations) => 
    set((state) => ({
      reservations: [...(state.reservations || []), ...newReservations]
    })),
  
  setTotalCount: (count) => set({ totalCount: count }),
  
  setCurrentPage: (page) => set({ currentPage: page }),
  
  setReservationFilter: (filter) => set({ reservationFilter: filter, currentPage: 1 }),
  
  resetReservations: () => set({ reservations: [], totalCount: 0, currentPage: 1 }),
}))

