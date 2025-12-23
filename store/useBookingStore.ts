import { create } from 'zustand'
import { DateRange } from 'react-day-picker';
import type { ExtrasItem } from '@/types/beds24';
import {  Extras,  Guests, Room, RoomDetails } from '@/types/types';
import { v4 as uuidv4 } from 'uuid';

export interface Booking {

  roomId: string | number | undefined;
  price: number;
  nights: number;
  isRefunable: boolean;
  roomsAmount: number;
  guests: Guests;
  totalPrice: number;


  status: 'confirmed' | 'request' | 'new' | 'cancelled' | 'black' | 'inquiry' ;
  arrival: string | Date | undefined;      
  departure: string | Date | undefined;    
  numAdult: number;
  numChild: number;
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: number | string; 
  address: string;
  city: string;
  state: string;
  postcode: string | number;
  country: string;
}

interface BookingState {
  roomDetails: RoomDetails | undefined;
  setRoomDetails: (roomDetails: RoomDetails) => void;


  rooms: Room[];
  extras: Extras[];

  booking: Booking;

  setValue: (
    value: number | string | string[] | boolean | DateRange | Guests | ExtrasItem[] , 
    key: string
  ) => void;


  
  //Rooms and content
  setRooms: (rooms: Room[]) => void;
  addRoom: () => void;
  removeRoom: (id: string) => void;
  editRoom: (id: string, newRoom: Room) => void;
  

  addExtra: (extra: Extras) => void;
  addExtra2: (extraId:string, roomsId:string) => void;

  setBooking: (booking: Booking | ((prev: Booking) => Booking)) => void;

}

export const useBookingStore = create<BookingState>((set) => ({

  roomDetails: undefined,
  setRoomDetails: (roomDetails: RoomDetails) => set((state) => ({ ...state, roomDetails })),




  rooms: [],
  extras: [],
  //booking process store
  booking: {
      //booking process store
      withoutAccount: false,

    //booking data store
    name: undefined,
    price: 0,
    nights: 0,
    isRefunable: false,
    roomsAmount: 0,
    rooms: [],
    extras:[],
    guests: { adults: 1, children: 0 },
    totalPrice: 0,

    //booking data store
    roomId: undefined,
    status: 'new',
    arrival: undefined,
    departure: undefined,
    numAdult: 0,
    numChild: 0,
    title: '',
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    country: '',
  },
  setValue: (value, key) => set((state) => ({ ...state, [key]: value })),

  setRooms: (rooms) => set((state) => ({ ...state, rooms })),
  addRoom: () => set((state) => {
    const newRoom: Room = { ...state.rooms[0], id: uuidv4(), adults: 1, children: 0, extras: [] }
    return { ...state, rooms: [...state.rooms, newRoom as Room] }
  }),
  removeRoom: (id) => set((state) => {
    if(state.rooms.length === 1) return state;
    return { ...state, rooms: state.rooms.filter((room) => room.id !== id) }
  }),
  editRoom: (id, newRoom) => set((state) => ({ ...state, rooms: state.rooms.map((room) => room.id === id ? newRoom : room)})), 

  addExtra: (extra: Extras) => set((state) => {
    if(state.extras.some(e => e.extraId === extra.extraId)) {
      return { ...state, extras: state.extras.map(e => e.extraId === extra.extraId ? extra : e) }
    } else {
      return { ...state, extras: [...state.extras, extra] }
    }
  }), 
  addExtra2: (extraId:string, roomsId:string) => set((state) => {
    const room = state.rooms.find(room => room.id === roomsId)
    if(!room) return state

    const currentExtras = room.extras || []
    const newExtras = currentExtras.includes(extraId) ? currentExtras.filter(extra => extra !== extraId) : [...currentExtras, extraId]
    const newRoom = { ...room, extras: newExtras }
    console.log(newRoom,'newRoom')
    return { ...state, rooms: state.rooms.map(room => room.id === roomsId ? newRoom : room) }
  }),

  setBooking: (booking) => set((state) => ({ 
    ...state, 
    booking: typeof booking === 'function' ? booking(state.booking) : booking
  })),

}))

