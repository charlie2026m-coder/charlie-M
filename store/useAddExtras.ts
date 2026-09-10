import { create } from 'zustand'
import { Service } from '@/types/apaleo'

export interface AddExtrasService {
  serviceId: string;
  count?: number;
  price?: number;
  dates?: {
    serviceDate: string;
    count?: number;
    amount?: {
      amount: number;
      currency: string;
    };
    // Client-only marker: true means this date is already on the Apaleo folio
    // (charged on a previous request) and should be excluded from the current
    // total. The server validator ignores this field and derives existing
    // dates from Apaleo itself — never trust the client here.
    isExisting?: boolean;
  }[];
}

interface AddExtrasState {
  openExtendYourStay: boolean;
  setOpenExtendYourStay: (open: boolean) => void;
  openChangeDates: boolean;
  setOpenChangeDates: (open: boolean) => void;
  services: AddExtrasService[];
  transactionReference: string | null;
  nights: number;
  availableExtras: Service[];
  setServices: (services: AddExtrasService[]) => void;
  addService: (service: AddExtrasService) => void;
  removeService: (serviceId: string) => void;
  updateService: (serviceId: string, updates: Partial<AddExtrasService>) => void;
  clearServices: () => void;
  setTransactionReference: (reference: string) => void;
  setNights: (nights: number) => void;
  setAvailableExtras: (extras: Service[]) => void;
}

export const useAddExtrasStore = create<AddExtrasState>((set) => ({
  // The two date panels are mutually exclusive: both rewrite the same stay, and
  // having them open together invites a guest to extend and move at once.
  openExtendYourStay: false,
  setOpenExtendYourStay: (open) =>
    set(open ? { openExtendYourStay: true, openChangeDates: false } : { openExtendYourStay: false }),
  openChangeDates: false,
  setOpenChangeDates: (open) =>
    set(open ? { openChangeDates: true, openExtendYourStay: false } : { openChangeDates: false }),
  services: [],
  transactionReference: null,
  nights: 0,
  availableExtras: [],
  
  setServices: (services) => set({ services }),
  setNights: (nights) => set({ nights }),
  setAvailableExtras: (availableExtras) => set({ availableExtras }),
  
  addService: (service) => set((state) => {
    // Check if service already exists
    const existingIndex = state.services.findIndex(s => s.serviceId === service.serviceId);
    
    if (existingIndex >= 0) {
      // Update existing service
      const newServices = [...state.services];
      newServices[existingIndex] = service;
      return { services: newServices };
    }
    
    // Add new service
    return { services: [...state.services, service] };
  }),
  
  removeService: (serviceId) => set((state) => ({
    services: state.services.filter(s => s.serviceId !== serviceId)
  })),
  
  updateService: (serviceId, updates) => set((state) => ({
    services: state.services.map(s => 
      s.serviceId === serviceId ? { ...s, ...updates } : s
    )
  })),
  
  clearServices: () => set({ services: [], transactionReference: null, nights: 0, availableExtras: [] }),
  
  setTransactionReference: (reference) => set({ transactionReference: reference })
}))
