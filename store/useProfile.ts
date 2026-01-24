import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Reservation } from '@/types/apaleo'
import { RoomDetails } from '@/services/getRoomsDetails'

export type ReservationFilter = 'All' | 'Ongoing' | 'Upcoming' | 'Completed' | 'Canceled'

interface ProfileState {
  reservations: Reservation[] | undefined
  totalCount: number
  currentPage: number
  roomDetails: RoomDetails[]
  reservationFilter: ReservationFilter
  guestBooking: any | null
  
  setValue: (value: string | number | Reservation[] | RoomDetails[] | undefined, key: string) => void
  setReservations: (reservations: Reservation[]) => void
  addReservations: (reservations: Reservation[]) => void
  setTotalCount: (count: number) => void
  setCurrentPage: (page: number) => void
  setReservationFilter: (filter: ReservationFilter) => void
  setGuestBooking: (booking: any) => void
  clearGuestMode: () => void
  resetReservations: () => void
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      reservations: undefined,
      totalCount: 0,
      currentPage: 1,
      roomDetails: [],
      reservationFilter: 'All',
      guestBooking: null,

      setValue: (value, key) => set((state) => ({ ...state, [key]: value })),
      
      setReservations: (reservations) => set({ reservations }),
      
      addReservations: (newReservations) => 
        set((state) => ({
          reservations: [...(state.reservations || []), ...newReservations]
        })),
      
      setTotalCount: (count) => set({ totalCount: count }),
      
      setCurrentPage: (page) => set({ currentPage: page }),
      
      setReservationFilter: (filter) => set({ reservationFilter: filter, currentPage: 1 }),
      
      setGuestBooking: (booking) => set({ guestBooking: booking }),
      
      clearGuestMode: () => {
        localStorage.removeItem('guestMode')
        localStorage.removeItem('guestBookingId')
        set({ guestBooking: null })
      },
      
      resetReservations: () => set({ reservations: [], totalCount: 0, currentPage: 1, guestBooking: null }),
    }),
    {
      name: 'charlie-profile-storage',
      partialize: (state) => ({ guestBooking: state.guestBooking }), // Only persist guest booking data
    }
  )
)

