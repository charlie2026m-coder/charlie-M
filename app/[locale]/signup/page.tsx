'use client'
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRegister } from '@/app/hooks/useAuth';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/app/_components/ui/button';
import { Checkbox } from '@/app/_components/ui/checkbox';
import CustomInput from '@/app/_components/ui/customInput';
import Divider from '@/app/_components/Auth/divider';
import SocialMediaButtons from '@/app/_components/Auth/SocialMediaButtons';
import ReservationForm from '@/app/_components/Auth/ReservationForm';
import { registerSchema, type RegisterFormData } from '@/types/schemas';
import { Link, useRouter } from '@/navigation';
import CustomCard from '@/app/_components/ui/CustomCard';
import { toast } from 'sonner';

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const registerMutation = useRegister();
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    setValue: setFormValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      consent: false,
    },
  });

  const email = watch('email');
  const password = watch('password');
  const confirmPassword = watch('confirmPassword');
  const consent = watch('consent');

  useEffect(() => {
    // Exclude consent error from general error message (it has its own display)
    const errorEntries = Object.entries(errors).filter(([field]) => field !== 'consent');
    
    if (errorEntries.length > 0) {
      const errorMessages = errorEntries
        .map(([field, error]) => error?.message)
        .filter(Boolean)
        .join(', ');
      setError(errorMessages);
    } else {
      setError(null);
    }
  }, [errors, email, password, confirmPassword, consent]);

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    try {
      const result = await registerMutation.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      
      if (result.requiresEmailConfirmation) {
        toast.success('Please check your email to confirm your account');
        router.push('/login');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
    }
  };

  // Show reservation form if user clicked "Continue with Reservation ID"
  if (showReservationForm) {
    return (
      <div className="bg-white md:px-4 md:py-16 flex items-center justify-center min-h-screen">
        <CustomCard className="w-full md:border max-w-md p-4 md:p-8">
          <div className="mb-4">
            <button 
              onClick={() => setShowReservationForm(false)}
              className="text-sm text-mute hover:text-black transition-colors"
            >
              ← Back to Sign Up
            </button>
          </div>
          <ReservationForm />
        </CustomCard>
      </div>
    );
  }

  return (
    <div className="bg-white  md:px-4 md:py-16 flex items-center justify-center py-10">
      <CustomCard className="w-full max-w-md p-4 md:p-8 md:border">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative mb-[30px]">
          <h1 className="text-3xl font-[400] text-center mb-2 ">Welcome to Charlie M</h1>
          <h2 className="text-xl text-center mb-6">Sign Up</h2>

          <CustomInput 
            register={register} 
            name="name" 
            type="text" 
            placeholder="Full Name" 
            icon="name" 
          />
          <CustomInput 
            register={register} 
            name="email" 
            type="email" 
            placeholder="Email" 
            icon="email" 
            isError={!!errors.email}
          />
          <CustomInput 
            register={register} 
            name="password" 
            type="password" 
            placeholder="Password" 
            icon="password" 
            isError={!!errors.password || !!errors.confirmPassword} 
          />
          <CustomInput 
            register={register} 
            name="confirmPassword" 
            type="password" 
            placeholder="Re-Password" 
            icon="password" 
            isError={!!errors.confirmPassword} 
          />

          <div className='pt-2'>
            <div className='flex items-start gap-3'>
              <Checkbox
                size='sm'
                id='consent-register'
                checked={consent}
                onCheckedChange={(checked) => {
                  setFormValue('consent', checked === true, { shouldValidate: true })
                }}
                className={errors.consent ? 'border-red' : ''}
              />
              <label 
                htmlFor='consent-register' 
                className='text-sm text-dark cursor-pointer leading-relaxed'
                onClick={() => setFormValue('consent', !consent, { shouldValidate: true })}
              >
                I agree to the{' '}
                <Link 
                  href='/privacy-policy' 
                  target='_blank'
                  className='text-blue underline hover:text-blue/80'
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </Link>
              </label>
            </div>
          </div>

          <Button
            type="submit"
            disabled={registerMutation.isPending || !isValid || !consent}
            className="w-full h-12 rounded-full bg-blue hover:bg-blue/80 text-white font-medium !mb-0"
          >
            {registerMutation.isPending ? 'Loading...' : 'Sign Up'}
          </Button>
          {error && <div className="absolute bottom-[-28px] text-center text-red text-sm px-4 w-full">{error}</div>}
        </form>

        <Divider />
        <SocialMediaButtons onReservationClick={() => setShowReservationForm(true)} />
        
        <div className="mt-4 text-center text-dark">
          Already have an account? 
          <Link href="/login" className="text-blue underline cursor-pointer pl-1">
            Login
          </Link>
        </div>
      </CustomCard>
    </div>
  );
}

