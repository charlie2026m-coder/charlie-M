export interface Beds24RoomsResponse {
  id: string | number;
  propertyId: string | number;
  name: string;
  minPrice: number;

  adults: number;
  children: number;
  people: number;

  maxAdult: number;
  maxChildren: number;
  maxPeople: number;

  qty: number;
  roomSize: number;
  roomType: string;

  featureCodes?: string[];
  hasBalcony?: boolean;
  unitsAvailable?: {
    total: number;
    free: number;
    availability: Record<string, boolean>;
  };
}

export interface Beds24RoomType {
  id: string | number;
  propertyId: string | number;
  name: string;
  roomType: string;
  minPrice: number;

  adults: number;
  children: number;
  people: number;

  maxAdult: number;
  maxChildren: number;
  maxPeople: number;
  qty: number;
  roomSize: number;

  featureCodes?: string[];
  hasBalcony?: boolean;
  unitsAvailable?: {
    total: number;
    free: number;
    availability: Record<string, boolean>;
  };
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

export interface UrlParams {
  from: string | undefined;
  to: string | undefined;
  adults: string | undefined;
  children: string | undefined;
}