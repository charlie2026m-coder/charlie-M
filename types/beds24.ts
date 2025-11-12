export interface Beds24RoomsResponse {
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
  units: [string];

  featureCodes?: string[];
  availability?: Record<string, boolean>;
}

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


  features?: string;
}

export interface Beds24PropertyWithRooms {
  propertyId: string | number;
  propertyName?: string;
  roomTypes?: Beds24RoomsResponse[];
  [key: string]: unknown;
}

export interface Beds24PropertiesResponse {
  data?: Beds24PropertyWithRooms[];
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface Beds24AvailabilityResponse {
  success: boolean;
  type: "availability";
  count: number;
  pages: {
    nextPageExists: boolean;
    nextPageLink: string | null;
  };
  data: RoomAvailability[];
}

export interface RoomAvailability {
  roomId: number;
  propertyId: number;
  name: string;
  availability: Record<string, boolean>; 
}