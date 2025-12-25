import { Service, SingleRoom } from "./apaleo";

export enum bookingStatuses {
  Confirmed = "Confirmed",
  InHouse = "InHouse",
  CheckedOut = "CheckedOut",
  Cancelled = "Cancelled",
  NoShow = "NoShow",
}

export interface ExtraDetails {
  id: string;
  title: string;
  price: number;
  period: string;
  description: string;
  imageUrl: string;
}

export interface Extras {
  extraId: string;
  roomsIds: string[];
}

export interface Guests{
  adults: number;
  children: number;
}

export interface Params extends Guests {
  from: string | undefined;
  to: string | undefined;
}


export type RoomExtra = Omit<Service, 'description' | 'daysOfWeek'>;

export interface Room {
  id: string;
  adults: number;
  children: number;
  from: string;
  to: string;
  extras?: RoomExtra[];
}

export interface RoomDetails extends SingleRoom {
  id: string;
  code: string;
}