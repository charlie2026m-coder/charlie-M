'use client'
import { FaPlus } from "react-icons/fa6";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
} from "@/app/_components/ui/dialog"
import { Button } from "@/app/_components/ui/button";
import { useState } from "react";
import { Service } from "@/types/apaleo";
import { ButtonIcon } from "@/app/_components/ui/ButtonIcon";
import { useAddExtrasStore } from "@/store/useAddExtras";

const AddUnlimitedExtra = ({ extra, adults, nights, existingCount = 0, bundleServices }: { extra: Service, adults: number, nights: number, existingCount?: number, bundleServices?: Service[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const services = useAddExtrasStore(state => state.services);
  const addService = useAddExtrasStore(state => state.addService);
  const removeService = useAddExtrasStore(state => state.removeService);

  // Breakfast bundle: book the real per-VAT services (food 7% + beverage 19%)
  // from `bundleServices`; `extra` is only the merged display card. Everything
  // else keeps its single-service path via the `[extra]` fallback.
  const bundle = bundleServices && bundleServices.length > 0 ? bundleServices : null;
  const servicesToWrite = bundle ?? [extra];
  const savedService = services.find(s => s.serviceId === servicesToWrite[0].id);
  const [count, setCount] = useState(savedService?.count || 0);
  
  const mode = extra.availability?.mode;
  const pricingUnit = extra.pricingUnit;
  
  const getMaxLimit = () => {
    if (pricingUnit === 'Room') {
      return 1;
    }
    if (pricingUnit === 'Person') {
      const remainingGuests = adults - existingCount;
      return remainingGuests;
    }
    return 1;
  };

  const maxLimit = getMaxLimit();

  const getTotalPrice = () => {
    if (mode === 'Daily' && pricingUnit === 'Room') {
      return Math.round(extra.price * count * nights * 100) / 100;
    }
    
    if (mode === 'Daily' && pricingUnit === 'Person') {
      return Math.round(extra.price * count * nights * 100) / 100;
    }
    
    return Math.round(extra.price * count * 100) / 100;
  };
  
  const add = () => {
    if (count >= maxLimit) return
    setCount(count + 1)
  }
  
  const subtract = () => {
    if (count <= 0) return
    setCount(count - 1)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      const savedService = services.find(s => s.serviceId === servicesToWrite[0].id);
      setCount(savedService?.count || 0);
    }
  };

  const handleConfirm = () => {
    if (count === 0) {
      // Remove every service this card owns (both breakfast halves when bundled).
      servicesToWrite.forEach(svc => removeService(svc.id));
      setIsOpen(false);
      return;
    }

    // One store entry per real service, each with its OWN catalog price, so the
    // folio and payment keep the food/beverage VAT split.
    servicesToWrite.forEach(svc => addService({
      serviceId: svc.id,
      count: count,
      price: svc.price,
    }));

    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div className='absolute flex top-2.5 right-2.5 items-center justify-center rounded transition-all duration-300 cursor-pointer size-10 shadow-lg bg-blue border-blue text-white'>
          <FaPlus className='size-6' />
        </div>
      </DialogTrigger>
      <DialogContent className="rounded-xl max-w-[600px] max-h-[80vh] w-full overflow-y-auto">
        <DialogHeader>
          <DialogTitle className='font-semibold text-xl'>
            Add {extra.name} (€{extra.price})
          </DialogTitle>
        </DialogHeader>

        <div className='py-2.5 border-b border-t flex items-center justify-between'>
          <div className='flex flex-col text-lg font-semibold '>
            <h3>Select quantity</h3>
            <p className='text-blue text-sm font-normal'>
              {pricingUnit === 'Room' ? 'Per room' : 'Per person'}
            </p>
          </div>
          <Button variant="outline" className='h-[45px]' onClick={() => setCount(maxLimit)}>
            Select maximum
          </Button>
        </div>

        <div className='flex items-center justify-between pt-2.5 pb-5 gap-2 overflow-hidden'>
          <div className='flex flex-col min-w-0 flex-1 overflow-hidden'>
            <span className='font-semibold truncate'>{extra.name}</span>
            <span className='text-sm text-gray-500 truncate'>
              €{extra.price} {mode === 'Daily' ? 'per day' : 'one time'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ButtonIcon onClick={subtract} symbol='-' disabled={count <= 0} />
            <span className="font-semibold min-w-[20px] text-center">
              {count}
            </span>
            <ButtonIcon onClick={add} symbol='+' disabled={count >= maxLimit} />
          </div>
        </div>

        <div className='flex items-center justify-between pt-5'>
          <span>Total: {count}</span>
          <Button onClick={handleConfirm} className='h-[45px]'>
            Confirm <span className='font-semibold'>€ {getTotalPrice().toFixed(2)}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddUnlimitedExtra;
