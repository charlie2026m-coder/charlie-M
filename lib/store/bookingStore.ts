import { create } from 'zustand'
import { Beds24RoomType } from '@/types/beds24'

interface BookingState {
  // Данные бронирования
  roomId: string | number | null
  room: Beds24RoomType | null
  from: string | null
  to: string | null
  adults: number
  children: number
  
  // Действия
  setRoom: (room: Beds24RoomType) => void
  setRoomId: (id: string | number) => void
  setDates: (from: string, to: string) => void
  setGuests: (adults: number, children: number) => void
  setBookingData: (data: {
    roomId?: string | number
    room?: Beds24RoomType
    from?: string
    to?: string
    adults?: number
    children?: number
  }) => void
  clearBooking: () => void
}

export const useBookingStore = create<BookingState>((set) => ({
  roomId: null,
  room: null,
  from: null,
  to: null,
  adults: 1,
  children: 0,

  setRoom: (room) => set({ room, roomId: room.id }),

  setRoomId: (id) => set({ roomId: id }),

  setDates: (from, to) => set({ from, to }),

  setGuests: (adults, children) => set({ adults, children }),

  setBookingData: (data) => set((state) => ({
    ...state,
    ...data,
  })),

  // Очистить данные бронирования
  clearBooking: () => set({
    roomId: null,
    room: null,
    from: null,
    to: null,
    adults: 1,
    children: 0,
  }),
}))

