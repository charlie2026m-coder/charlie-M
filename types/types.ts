import { Beds24RoomType } from "./beds24";

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

export interface Room {
  id: string;
  adults: number;
  children: number;
  from: string;
  to: string;
  extras: string[];
}

export interface RoomDetails extends Beds24RoomType {
  id: string;
  title: string;
  description: string;
  price: number;

}