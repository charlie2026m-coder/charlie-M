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
  }[];
}

interface AddExtrasState {
  openExtendYourStay: boolean;
  setOpenExtendYourStay: (open: boolean) => void;
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
  openExtendYourStay: false,
  setOpenExtendYourStay: (open) => set({ openExtendYourStay: open }),
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
