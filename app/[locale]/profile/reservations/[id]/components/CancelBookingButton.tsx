'use client'
import { Button } from "@/app/_components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader } from "@/app/_components/ui/ClientDialog";
import { useCancelReservation } from "@/app/hooks/useReservations";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/navigation";
import { useTranslations } from 'next-intl';

interface CancelBookingButtonProps {
  reservationId: string;
  onClose?: () => void;
}

export default function CancelBookingButton({ reservationId, onClose }: CancelBookingButtonProps) {
  const t = useTranslations('reservations');
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { mutate: cancelReservation, isPending } = useCancelReservation();

  const handleCancel = () => {
    cancelReservation(reservationId, {
      onSuccess: () => {
        toast.success(t('bookingCancelledSuccessfully'));
        setOpen(false);
        onClose?.();
        router.push('/profile/reservations');
      },
      onError: (error) => {
        toast.error(error.message || t('failedToCancelBooking'));
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className='w-full h-[45px] mt-3'>
          {t('cancelBooking')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-1xl">{t('cancelBooking')}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 justify-center pt-4">
          <Button
            variant="destructive"
            className="flex-1 h-[45px]"
            onClick={handleCancel}
            disabled={isPending}
          >
            {isPending ? t('cancelling') : t('accept')}
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
  );
}

