'use client';
import { useState, useEffect } from 'react';
import { useRouter } from '@/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/app/_components/ui/dialog';
import Success from '@/app/_components/Auth/Success';
import LoginForm from '@/app/_components/Auth/LoginForm';
import ResetPasswordForm from '@/app/_components/Auth/ResetPasswordForm';
import { contentType } from '@/app/_components/Auth/AuthModal';
import ReservationForm from '@/app/_components/Auth/ReservationForm';

export default function ResetPassword() {
  const router = useRouter();

  const [formType, setFormType] = useState<contentType>('resetPassword');
  const [isValidSession, setIsValidSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkRecoverySession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          toast.error('Invalid or expired reset link. Please request a new one.');
          router.push('/');
          return;
        }

        setIsValidSession(true);
      } catch (err) {
        console.error('Session check error:', err);
        toast.error('Something went wrong. Please try again.');
        router.push('/');
      } finally {
        setIsChecking(false);
      }
    };

    checkRecoverySession();
  }, [router]);

  if (isChecking) return null;
  if (!isValidSession) return null;

  return (
    <Dialog open={true} onOpenChange={() => router.push('/')}>
      <DialogContent className="!max-w-[600px] px-4 md:px-15 xl:px-25 w-[95%] gap-0  py-[50px] rounded-3xl bg-white">
        {/* Hide the title of dialog but left him for screen readers */}
        <DialogTitle className="absolute opacity-0">Reset Password</DialogTitle>

        {formType === 'success'  && <Success type='passSuccess' onClose={() => setFormType('login')} />}
        {formType === 'resetPassword' && <ResetPasswordForm setFormType={setFormType} /> }
        {formType === 'login' && <LoginForm setFormType={setFormType} /> }
        {formType === 'reservation' && <ReservationForm /> }
      </DialogContent>
    </Dialog>
  );
}