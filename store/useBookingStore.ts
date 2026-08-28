import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DateRange } from 'react-day-picker';
import type { Service } from '@/types/apaleo';
import { Guests, Room } from '@/types/types';
import { v4 as uuidv4 } from 'uuid';
import { RoomOffer } from '@/types/offers';
import { Booking } from '@/types/booking';

export interface BookingService {
  serviceId: string;
  count?: number;
  dates?: {
    serviceDate: string;
    count: number;
    amount?: {
      amount: number;
      currency: string;
    };
  }[];
}

interface BookingState {
  booking: Booking | undefined;
  transactionReference: string | null;
  paymentReference: string | null;
  reservationId: string | null;
  apaleoBookingId: string | null;
  reservationIds: string[];
  
  roomDetails: RoomOffer | undefined;
  rooms: Room[] ;
  services: BookingService[];
  extras: Service[];

  isRefundable: boolean;
  /** Unit the guest must land on (stay extension). */
  preferredUnitId?: string | null;
  isExtend: boolean;
  params: { from: string; to: string; nights: number; }
  bookingId: string | undefined;

  
  setBooking: (booking: Booking) => void;
  setTransactionReference: (transactionReference: string) => void;
  setPaymentReference: (paymentReference: string | null) => void;
  setReservationId: (reservationId: string) => void;
  setApaleoBookingId: (id: string) => void;
  setReservationIds: (ids: string[]) => void;
  setRoomDetails: (roomDetails: RoomOffer) => void;
  setServices: (services: BookingService[]) => void;
  setExtras: (extras: Service[]) => void;

  setIsRefundable: (isRefundable: boolean) => void;
  setPreferredUnitId: (unitId: string | null) => void;
  setIsExtend: (isExtend: boolean) => void;
  setParams: (params: { from: string; to: string; nights: number }) => void;
  setBookingId: (id: string) => void;

  //Rooms and content
  setRooms: (rooms: Room[]) => void;
  addRoom: () => void;
  removeRoom: (id: string) => void;
  editRoom: (id: string, newRoom: Room) => void;
  
  setValue: (
    value: number | string | string[] | boolean | DateRange | Guests | Service[] , 
    key: string
  ) => void;
  
  clearBooking: () => void;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      roomDetails: undefined,
      setRoomDetails: (roomDetails: RoomOffer) => set((state) => ({ ...state, roomDetails })),

      transactionReference: null,
      setTransactionReference: (transactionReference: string) => set((state) => ({ ...state, transactionReference })),

      paymentReference: null,
      setPaymentReference: (paymentReference: string | null) => set((state) => ({ ...state, paymentReference })),

      reservationId: null,
      setReservationId: (reservationId: string) => set((state) => ({ ...state, reservationId })),

      apaleoBookingId: null,
      setApaleoBookingId: (apaleoBookingId: string) => set((state) => ({ ...state, apaleoBookingId })),

      reservationIds: [],
      setReservationIds: (reservationIds: string[]) => set((state) => ({ ...state, reservationIds })),

      services: [],
      setServices: (services: BookingService[]) => set((state) => ({ ...state, services })),

      extras: [],
      setExtras: (extras: Service[]) => set((state) => ({ ...state, extras })),

      isRefundable: false,
      setIsRefundable: (isRefundable: boolean) => set((state) => ({ ...state, isRefundable })),
      setPreferredUnitId: (preferredUnitId: string | null) => set((state) => ({ ...state, preferredUnitId })),
      
      isExtend: false,
      setIsExtend: (isExtend: boolean) => set((state) => ({ ...state, isExtend })),
      
      params: {
        from: '',
        to: '',
        nights: 0,
      },
      bookingId: undefined,
      setParams: (params: { from: string; to: string; nights: number }) => set((state) => ({ ...state, params })),
      setBookingId: (id: string) => set((state) => ({ ...state, bookingId: id })),

      rooms: [],
      booking: undefined,
      setValue: (value, key) => set((state) => ({ ...state, [key]: value })),

      setRooms: (rooms) => {
        set((state) => ({ ...state, rooms }))
      },
      addRoom: () => set((state) => {
        const newRoom: Room = { ...state.rooms[0], id: uuidv4(), adults: 1, children: 0, extras: [] }
        return { ...state, rooms: [...state.rooms, newRoom as Room] }
      }),
      removeRoom: (id) => set((state) => {
        if(state.rooms.length === 1) return state;
        const newRooms = state.rooms.filter((room) => room.id !== id)
        return { ...state, rooms: newRooms }
      }),
      editRoom: (id, newRoom) => set((state) => ({ ...state, rooms: state.rooms.map((room) => room.id === id ? newRoom : room)})), 

      setBooking: (booking) => {
        set((state) => ({ ...state, booking }))
      },
      
      clearBooking: () => {
        set({
          booking: undefined,
          rooms: [],
          roomDetails: undefined,
          bookingId: undefined,
          isRefundable: false,
          isExtend: false,
          transactionReference: null,
          paymentReference: null,
          reservationId: null,
          apaleoBookingId: null,
          reservationIds: [],
          services: [],
          extras: [],
        })
      },
    }),
    {
      name: 'charlie-booking-storage',
      version: 1,
      migrate: (persistedState: unknown) => {
        const state = persistedState as Record<string, unknown>;
        return { ...state, isRefundable: false };
      },
      partialize: (state) => ({
        booking: state.booking,
        rooms: state.rooms,
        roomDetails: state.roomDetails,
        bookingId: state.bookingId,
        isRefundable: state.isRefundable,
        isExtend: state.isExtend,
        transactionReference: state.transactionReference,
        paymentReference: state.paymentReference,
        reservationId: state.reservationId,
        apaleoBookingId: state.apaleoBookingId,
        reservationIds: state.reservationIds,
        services: state.services,
        extras: state.extras,
      }),
    }
  )
)



