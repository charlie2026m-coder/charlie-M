'use client'
import { Button } from "@/app/_components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader } from "@/app/_components/ui/ClientDialog";
import { useCancelReservation } from "@/app/hooks/useReservations";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/navigation"; // Use localized router

interface CancelBookingButtonProps {
  reservationId: string;
  onClose?: () => void;
}

export default function CancelBookingButton({ reservationId, onClose }: CancelBookingButtonProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { mutate: cancelReservation, isPending } = useCancelReservation();

  const handleCancel = () => {
    cancelReservation(reservationId, {
      onSuccess: () => {
        toast.success('Booking cancelled successfully');
        setOpen(false);
        onClose?.();
        router.push('/profile/reservations');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to cancel booking');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className='w-full h-[45px] mt-3'>
          Cancel Booking
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-1xl">Cancel Booking</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 justify-center pt-4">
          <Button
            variant="destructive"
            className="flex-1 h-[45px]"
            onClick={handleCancel}
            disabled={isPending}
          >
            {isPending ? 'Cancelling...' : 'Accept'}
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-[45px]"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Decline
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

