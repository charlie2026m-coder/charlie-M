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
  guestData: any | null
  
  setValue: (value: string | number | Reservation[] | RoomDetails[] | undefined, key: string) => void
  setReservations: (reservations: Reservation[]) => void
  addReservations: (reservations: Reservation[]) => void
  setTotalCount: (count: number) => void
  setCurrentPage: (page: number) => void
  setReservationFilter: (filter: ReservationFilter) => void
  setGuestData: (data: any | null) => void
  clearGuestMode: () => void
  resetReservations: () => void
}

export const useProfileStore = create<ProfileState>()(
  (set) => ({
    reservations: undefined,
    totalCount: 0,
    currentPage: 1,
    roomDetails: [],
    reservationFilter: 'All',
    guestData: null,

    setValue: (value, key) => set((state) => ({ ...state, [key]: value })),
    
    setReservations: (reservations) => set({ reservations }),
    
    addReservations: (newReservations) => 
      set((state) => ({
        reservations: [...(state.reservations || []), ...newReservations]
      })),
    
    setTotalCount: (count) => set({ totalCount: count }),
    
    setCurrentPage: (page) => set({ currentPage: page }),
    
    setReservationFilter: (filter) => set({ reservationFilter: filter, currentPage: 1 }),
    
    setGuestData: (data) => {
      set({ guestData: data })
      if (data) {
        sessionStorage.setItem('guestData', JSON.stringify(data))
      } else {
        sessionStorage.removeItem('guestData')
      }
    },
    
    clearGuestMode: () => {
      sessionStorage.removeItem('guestMode')
      sessionStorage.removeItem('guestData')
      set({ guestData: null })
    },
    
    resetReservations: () => set({ reservations: [], totalCount: 0, currentPage: 1, guestData: null }),
  })
)

