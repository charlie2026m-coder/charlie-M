import { Service, SingleRoom } from "./apaleo";

export enum bookingStatuses {
  Confirmed = "Confirmed",
  InHouse = "InHouse",
  CheckedOut = "CheckedOut",
  Canceled = "Canceled",
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


export type RoomExtra = Omit<Service, 'description'> & {
  totalPrice?: number;
  count?: number;
  dates?: {
    serviceDate: string;
    count: number;
    amount?: {
      amount: number;
      currency: string;
    };
  }[];
  selectedDates?: {
    serviceDate: string;
    count: number;
  }[];
  /**
   * Breakfast only: which menu the guest picked for each MORNING.
   *
   * Keyed by morning, not by serviceDate, and named differently on purpose.
   * Apaleo dates breakfast by the NIGHT and the guest eats it the morning
   * after, so the two are never the same day — one field called `serviceDate`
   * holding both would be an off-by-one waiting to happen. See
   * lib/breakfastDates.ts.
   *
   * Carries no money: the price comes from the service count exactly as
   * before. This rides along in the booking payload so the choice survives to
   * the webhook, which is the first moment a reservation id exists to attach
   * it to.
   */
  breakfastMenus?: {
    morning: string;
    /** How many of the party take each menu that morning, e.g. { A: 1, B: 1 }.
     *  A room is not one appetite. */
    menus: Record<string, number>;
  }[];
};

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
