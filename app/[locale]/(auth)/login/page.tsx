'use client'
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLogin } from '@/app/hooks/useAuth';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/app/_components/ui/button';
import CustomInput from '@/app/_components/ui/customInput';
import Divider from '@/app/_components/Auth/divider';
import SocialMediaButtons from '@/app/_components/Auth/SocialMediaButtons';
import ReservationForm from '@/app/_components/Auth/ReservationForm';
import { type LoginFormData, loginSchema } from '@/types/schemas';
import { Link } from '@/navigation';
import CustomCard from '@/app/_components/ui/CustomCard';
import { useTranslations } from 'next-intl';
import Header from '@/app/_components/header/Header';
import { useParams } from 'next/navigation';

export default function LoginPage() {
  const t = useTranslations('login');
  const params = useParams();
  const locale = params.locale as string;
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const loginMutation = useLogin();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  const email = watch('email');
  const password = watch('password');

  // Handle any errors from form validation
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const errorMessages = Object.entries(errors).map(([, error]) => error?.message).filter(Boolean).join(', ');
      setLoginError(errorMessages);
    } else {
      setLoginError(null);
    }
  }, [errors, email, password]);

  // Clear login error when user types
  useEffect(() => {
    if (loginError) {
      setLoginError(null);
    }
  }, [email, password]);

  // Handle form submission
  const onSubmit = async (data: LoginFormData) => {
    setLoginError(null);
    try {
      await loginMutation.mutateAsync({ email: data.email, password: data.password });
    } catch (err: any) {
      setLoginError(err?.response?.data?.message || err?.message || t('loginFailed'));
    }
  };

  // Show reservation form if user clicked "Continue with Reservation ID"
  if (showReservationForm) {
    return (
      <>
        <Header locale={locale} />
        <div className="bg-white md:px-4 md:py-16 flex items-center justify-center py-10">
        <CustomCard className="w-full md:border max-w-md p-4 md:p-8">
          <div className="mb-4">
            <button 
              onClick={() => setShowReservationForm(false)}
              className="text-sm text-mute hover:text-black transition-colors"
            >
              {t('backToLogin')}
            </button>
          </div>
          <ReservationForm />
        </CustomCard>
      </div>
      </>
    );
  }

  return (
    <>
      <Header locale={locale} />
      <div className="bg-white md:px-4 md:py-16 flex items-center justify-center py-10">
      <CustomCard className="w-full md:border max-w-md p-4  md:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative mb-[30px]">
          <h1 className="text-3xl font-[400] text-center mb-2 ">{t('welcome')}</h1>
          <h2 className="text-xl text-center mb-6">{t('title')}</h2>

          <CustomInput 
            register={register} 
            name="email" 
            type="email" 
            placeholder={t('email')} 
            icon="email" 
            isError={!!errors.email} 
          />
          <CustomInput 
            register={register} 
            name="password" 
            type="password" 
            placeholder={t('password')} 
            icon="password" 
            isError={!!errors.password} 
          />

          <Link href="/forgot-password" className="text-sm text-mute font-light cursor-pointer hover:text-mute/50 transition-colors">
            {t('forgotPassword')}
          </Link>

          <Button
            type="submit"
            disabled={loginMutation.isPending || !isValid}
            className="w-full h-12 rounded-full bg-blue hover:bg-blue/80 text-white font-medium !mb-0"
          >
            {loginMutation.isPending ? t('loading') : t('loginButton')}
          </Button>

          {loginError && (
            <div className="absolute -bottom-10 text-center text-red text-sm px-4 w-full">
              {loginError}
            </div>
          )}
        </form>
        
        <Divider />
        <SocialMediaButtons onReservationClick={() => setShowReservationForm(true)} />
        
        <div className="mt-4 text-center text-sm text-mute">
          {t('noAccount')} 
          <Link href="/signup" className="text-blue hover:text-black underline cursor-pointer pl-1">
            {t('signUp')}
          </Link>
        </div>
      </CustomCard>
    </div>
    </>
  );
}

