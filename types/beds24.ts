export interface Beds24RoomType {
  id: string | number;
  maxAdult: number;
  maxChildren: number;
  maxPeople: number;
  maxStay: number;
  minPrice: number;
  minStay: number;
  name: string;
  propertyId: string | number;
  qty: number;
  rackRate: number;
  roomSize: number;
  roomType: string;
}

export interface Beds24PropertyWithRooms {
  propertyId: string | number;
  propertyName?: string;
  roomTypes?: Beds24RoomType[];
  [key: string]: unknown;
}

export interface Beds24PropertiesResponse {
  data?: Beds24PropertyWithRooms[];
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}
