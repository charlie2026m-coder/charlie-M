export interface Rate {
  from?: string;
  to?: string;
  price?: {
    amount: number;
    currency: string;
  };
  calculatedPrices?: {
    adults: number;
    price: {
      amount: number;
      currency: string;
    };
  }[];
  restrictions?: {
    minLengthOfStay?: number;
    maxLengthOfStay?: number;
    closed?: boolean;
    closedOnArrival?: boolean;
    closedOnDeparture?: boolean;
  };
}

export interface ratePlanResponse {
  ratePlans: [{
    id: string;
    code: string;
    unitGroup: { id: string; }
    price: number;
  }]
}