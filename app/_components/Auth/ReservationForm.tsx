import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import CustomInput from '../ui/customInput';
import { useSearchBooking } from '@/app/hooks/useSearchBooking';
import { toast } from 'sonner';
import { useRouter } from '@/navigation';
import { type ReservationFormData, reservationSchema } from '@/types/schemas';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/store/useProfile';

const ReservationForm = () => {
  const [error, setError] = useState<string | null>(null);
  const [showNotFound, setShowNotFound] = useState(false);
  const searchBooking = useSearchBooking();
  const router = useRouter();
  const { setGuestBooking } = useProfileStore();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    mode: 'onChange',
  });

  const number = watch('number');

  // Handle any errors from form validation
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const errorMessages = Object.entries(errors).map(([, error]) => error?.message).filter(Boolean).join(', ');
      setError(errorMessages);
    } else {
      setError(null);
    }
  }, [errors, number]);

  const onSubmit = async (data: ReservationFormData) => {
    setError(null);
    
    searchBooking.mutate(
      {
        externalCode: data.number,
        lastName: data.name,
      },
      {
        onSuccess: async (response) => {
          try {
            // Save booking data to store and localStorage
            setGuestBooking(response.booking);
            
            // Save guest mode flag and booking ID to localStorage
            if (response.booking?.id) {
              localStorage.setItem('guestMode', 'true');
              localStorage.setItem('guestBookingId', response.booking.id);
            }
            
            // Check if user is already signed in
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
              // Create anonymous session
              const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
              
              if (authError) {
                console.error('Error creating anonymous session:', authError);
                toast.error('Failed to create session');
                return;
              }
              
              console.log('Anonymous session created:', authData.user?.id);
            }
            
            toast.success('Booking found!');
            
            // Redirect to reservations page
            router.push('/profile/reservations');
          } catch (error) {
            console.error('Error in onSuccess:', error);
            toast.error('Something went wrong');
          }
        },
        onError: (error) => {
          setShowNotFound(true);
        },
      }
    );
  };

  const handleReset = () => {
    setShowNotFound(false);
    setError(null);
    reset();
  };
  if (showNotFound) {
    return <NotFound onReset={handleReset} />;
  }

  return (
    <div className="w-full ">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative mb-[30px]">
        <h2 className="text-xl text-center mb-6">Continue with Reservation ID</h2>

        <CustomInput 
          register={register} 
          name="number" 
          type="text" 
          placeholder="Enter Booking.com Number" 
          icon="booking" 
          isError={!!errors.number} 
        />
        <CustomInput 
          register={register} 
          name="name" 
          type="text" 
          placeholder="Last Name" 
          icon="name" 
          isError={!!errors.name} 
        />

        <Button
          type="submit"
          disabled={searchBooking.isPending || !isValid}
          className="w-full h-12 rounded-full bg-blue hover:bg-blue/80 font-medium !mb-0"
        >
          {searchBooking.isPending ? 'Searching...' : 'Continue'}
        </Button>

        {error && (
          <div className="absolute bottom-[-28px] text-center text-red text-sm px-4 w-full">
            {error}
          </div>
        )}
      </form>
    </div>
  );
};

export default ReservationForm;


const NotFound = ({ onReset }: { onReset: () => void }) => {
  return (
    <div className='w-full flex flex-col items-center justify-center'>
      <h1 className='text-[20px] font-medium mb-4'>No found</h1>
      <p className='text-base text-dark'>Nothing found for this Reservation ID number. Please, check and try again.</p>
      <Image src='/images/not-found-booking.svg' alt='not-found' width={330} height={260} className='w-[330px] object-cover mx-auto mb-4' />
      <Button className='w-full h-[45px]' onClick={onReset}>Ok</Button>
    </div>
  )
}