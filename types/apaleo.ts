export interface UnitGroup{
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface UnitGroupsResponse {
  timeSlices: {
    unitGroups: {
      from: string;
      to: string;
      availableCount: number;
      unitGroup: UnitGroup;
    }[];
  } []
  count: number;
}



export interface Unit {
  id: string;
  name: string;
  description?: string;

  created: string;
  maxPersons: number;
  property: { id: string; };
  unitGroup: { id: string; };
  status: {
    isOccupied: boolean;
    condition: "Clean" | "Dirty" | "Inspected" | string;
  };
  attributes?: UnitAttribute[];
}

export interface UnitsResponse {
  units: Unit[];
  count: number;
}

export interface UnitAttribute {
  id: string;
  name: string;
  description: string;
}


export interface RoomGroup extends UnitGroup {
  maxPersons: number;
  price: number;
  currency: string;
  attributes: string[];
}

export interface ratePlanResponse {
  ratePlans: [{
    id: string;
    code: string;
    unitGroup: {
      id: string;
    }
  }]
}

export interface rateResponse { 
  rates: [{
    price: {
      amount: number;
      currency: string;
    };
    from: string;
    to: string;
    
  }]
}