'use client'
import { useDeleteReservationService } from "@/app/hooks/useReservations";
import { ServiceDetails } from "@/types/apaleo";
import { TiDelete } from "react-icons/ti";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader } from "@/app/_components/ui/ClientDialog";
import { Button } from "@/app/_components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';

export const ExtraRow = ({ service, nights, price, isActive, reservationId }: { service: ServiceDetails, nights: number, price: number, isActive: boolean, reservationId: string }) => {
  const t = useTranslations('reservations');
  const textUnit = service.pricingUnit === 'Room' ? `x ${nights} ${nights === 1 ? 'night' : 'nights'}` : 'x Person';
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { mutate: deleteService, isPending } = useDeleteReservationService();
  
  const handleDeleteService = () => {
    deleteService(
      { reservationId, serviceId: service.id },
      {
        onSuccess: () => {
          toast.success(t('serviceRemovedSuccessfully'));
          setOpen(false);
          router.refresh(); 
        },
        onError: (error) => {
          toast.error(error.message || t('failedToRemoveService'));
        },
      }
    );
  };

  return (
    <div className='flex gap-2 text-lg justify-between w-full group'>
      <div className='flex flex-col gap-2 inter text-sm text-dark'>
        <span>{service.name}</span>
        <span>€{service.defaultGrossPrice.amount} {textUnit} </span>
      </div>
      <div className='flex flex-col font-semibold items-end'>
        {isActive && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <TiDelete className='size-6 cursor-pointer text-red-500 opacity-40 group-hover:opacity-100 transition-all duration-500' />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-1xl">{t('removeService')}</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2 justify-center pt-4">
                <Button
                  variant="destructive"
                  className="flex-1 h-[45px]"
                  onClick={handleDeleteService}
                  disabled={isPending}
                >
                  {isPending ? t('removing') : t('remove')}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-[45px]"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  {t('decline')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        <span>€{price}</span>
      </div>
    </div>
  )
}