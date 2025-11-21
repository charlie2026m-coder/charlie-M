import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLogin } from '@/app/hooks/useAuth';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import CustomInput from '../ui/customInput';

import { type ReservationFormData, reservationSchema } from '@/types/schemas';

const ReservationForm = () => {
  const [error, setError] = useState<string | null>(null);
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    watch,
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
  };

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
          disabled={loginMutation.isPending || !isValid}
          className="w-full h-12 rounded-full bg-brown hover:bg-brown/80 text-white font-medium !mb-0"
        >
          {loginMutation.isPending ? 'Loading...' : 'Continue'}
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
