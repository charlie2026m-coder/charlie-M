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
import { useTranslations } from 'next-intl';

export default function SignUpPage() {
  const t = useTranslations('signUp');
  const [submitError, setSubmitError] = useState<string | null>(null);
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

  // Clear submit error when user types
  useEffect(() => {
    if (submitError) {
      setSubmitError(null);
    }
  }, [email, password, confirmPassword]);

  // Get validation error message (exclude consent error from general error message)
  const validationError = Object.entries(errors)
    .filter(([field]) => field !== 'consent')
    .map(([, error]) => error?.message)
    .filter(Boolean)
    .join(', ');

  const error = submitError || validationError || null;

  const onSubmit = async (data: RegisterFormData) => {
    setSubmitError(null);
    try {
      const result = await registerMutation.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      
      if (result.requiresEmailConfirmation) {
        toast.success(t('checkEmailToConfirm'));
        router.push('/login');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('registrationFailed');
      setSubmitError(errorMessage);
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
              {t('backToSignUp')}
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
          <h1 className="text-3xl font-[400] text-center mb-2 ">{t('welcome')}</h1>
          <h2 className="text-xl text-center mb-6">{t('title')}</h2>

          <CustomInput 
            register={register} 
            name="name" 
            type="text" 
            placeholder={t('fullName')} 
            icon="name" 
          />
          <CustomInput 
            register={register} 
            name="email" 
            type="email" 
            placeholder={t('email')} 
            icon="email" 
            isError={!!errors.email}
          />
          <div className="relative">
            <CustomInput 
              register={register} 
              name="password" 
              type="password" 
              placeholder={t('password')} 
              icon="password" 
              isError={!!errors.password || !!errors.confirmPassword} 
            />
            <p className="text-xs text-mute mt-1 pl-4">{t('passwordRequirements')}</p>
          </div>
          <CustomInput 
            register={register} 
            name="confirmPassword" 
            type="password" 
            placeholder={t('confirmPassword')} 
            icon="password" 
            isError={!!errors.confirmPassword} 
          />

          <div className='pt-2'>
            <div className='flex items-center gap-3'>
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
                {t('agreeTo')}{' '}
                <Link 
                  href='/privacy-policy' 
                  target='_blank'
                  className='text-blue underline hover:text-blue/80'
                  onClick={(e) => e.stopPropagation()}
                >
                  {t('privacyPolicy')}
                </Link>
              </label>
            </div>
          </div>

          <Button
            type="submit"
            disabled={registerMutation.isPending || !isValid || !consent}
            className="w-full h-12 rounded-full bg-blue hover:bg-blue/80 text-white font-medium !mb-0"
          >
            {registerMutation.isPending ? t('loading') : t('signUpButton')}
          </Button>
          {error && <div className="absolute -bottom-10 text-center text-red text-sm px-4 w-full">{error}</div>}
        </form>

        <Divider />
        <SocialMediaButtons onReservationClick={() => setShowReservationForm(true)} />
        
        <div className="mt-4 text-center text-dark">
          {t('alreadyHaveAccount')}{' '}
          <Link href="/login" className="text-blue underline cursor-pointer pl-1">
            {t('login')}
          </Link>
        </div>
      </CustomCard>
    </div>
  );
}

