'use client';
import { useState, useEffect } from 'react';
import { useRouter } from '@/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import ResetPasswordForm from '@/app/_components/Auth/ResetPasswordForm';
import { useTranslations } from 'next-intl';
import CustomCard from '@/app/_components/ui/CustomCard';
import Header from '@/app/_components/header/Header';
import { useParams } from 'next/navigation';

export default function ResetPassword() {
  const t = useTranslations('resetPassword');
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [isValidSession, setIsValidSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkRecoverySession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          toast.error(t('invalidOrExpiredResetLink'));
          router.push('/');
          return;
        }

        setIsValidSession(true);
      } catch (err) {
        console.error('Session check error:', err);
        toast.error(t('somethingWentWrong'));
        router.push('/');
      } finally {
        setIsChecking(false);
      }
    };

    checkRecoverySession();
  }, [router, t]);

  if (isChecking) {
    return (
      <>
        <Header locale={locale} />
        <div className="bg-white md:px-4 md:py-16 flex items-center justify-center flex-1">
          <div className="text-center">
            <p className="text-dark">{t('loading') || 'Loading...'}</p>
          </div>
        </div>
      </>
    );
  }

  if (!isValidSession) {
    return null;
  }

  return (
    <>
      <Header locale={locale} />
      <div className="bg-white md:px-4 md:py-16 flex items-center justify-center flex-1 py-10">
        <CustomCard className="w-full max-w-md p-4 md:p-8 md:border">
          <ResetPasswordForm />
        </CustomCard>
      </div>
    </>
  );
}