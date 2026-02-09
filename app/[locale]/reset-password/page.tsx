'use client';
import { useState, useEffect } from 'react';
import { useRouter } from '@/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import ResetPasswordForm from '@/app/_components/Auth/ResetPasswordForm';
import { useTranslations } from 'next-intl';
import CustomCard from '@/app/_components/ui/CustomCard';

export default function ResetPassword() {
  const t = useTranslations('resetPassword');
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
      <div className="bg-white md:px-4 md:py-16 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-dark">{t('loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!isValidSession) {
    return null;
  }

  return (
    <div className="bg-white md:px-4 md:py-16 flex items-center justify-center min-h-screen py-10">
      <CustomCard className="w-full max-w-md p-4 md:p-8 md:border">
        <ResetPasswordForm />
      </CustomCard>
    </div>
  );
}