import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useProfileStore } from '@/store/useProfile';
import { ReservationIdHelp } from './ReservationIdHelp';

const ReservationForm = ({ initialReservationId = '' }: { initialReservationId?: string }) => {
  const t = useTranslations('login');
  const [reservationId, setReservationId] = useState(initialReservationId);
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const { setGuestData } = useProfileStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reservationId.trim() || !lastName.trim()) {
      setError(t('checkBookingId') || 'Please enter reservation ID and last name');
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      // Ensure a session exists BEFORE the lookup — the server links the
      // verified reservation to this user so the ownership-gated routes work.
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        const { error: authError } = await supabase.auth.signInAnonymously();

        if (authError) {
          console.error('Error creating anonymous session:', authError);
          toast.error('Failed to create session');
          setIsPending(false);
          return;
        }
      }

      const response = await fetch(
        `/api/reservations/search-booking?reservationId=${encodeURIComponent(reservationId)}&lastName=${encodeURIComponent(lastName)}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 404) {
          // Neutral message — covers a wrong ID AND a wrong last name.
          setError(t('checkBookingIdOrName') || 'Please check the Reservation ID and last name.');
        } else if (response.status === 429) {
          setError(t('tooManyAttempts') || 'Too many attempts. Please try again in a few minutes.');
        } else if (response.status >= 500) {
          setError(t('serverErrorTryAgain') || 'Server error. Please try again.');
        } else {
          setError(errorData.error || t('serverErrorTryAgain') || 'Server error. Please try again.');
        }
        setIsPending(false);
        return;
      }

      const data = await response.json();

      // Save full data to store and sessionStorage
      setGuestData(data);
      sessionStorage.setItem('guestMode', 'true');

      // Redirect to reservations page
      router.push('/profile/reservations');
    } catch (error) {
      console.error('Error searching booking:', error);
      setError(t('serverErrorTryAgain'));
      setIsPending(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4 relative mb-[30px]">
        <h2 className="text-xl text-center mb-6">{t('continueWithReservationId')}</h2>

        <Input
          name="reservationId"
          type="text"
          placeholder={`${t('enterReservationId')} (e.g. EXAMPLEID-0)`}
          value={reservationId}
          onChange={(e) => {
            setReservationId(e.target.value);
            if (error) setError(null);
          }}
          disabled={isPending}
          className="w-full h-12 rounded-full px-5"
        />

        <Input
          name="lastName"
          type="text"
          placeholder={t('enterLastName')}
          value={lastName}
          onChange={(e) => {
            setLastName(e.target.value);
            if (error) setError(null);
          }}
          disabled={isPending}
          className="w-full h-12 rounded-full px-5"
        />

        {error && (
          <div className="text-red-500 text-sm text-center break-words whitespace-normal w-full">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isPending || !reservationId.trim() || !lastName.trim()}
          className="w-full h-12 rounded-full bg-blue hover:bg-blue/80 font-medium !mb-0"
        >
          {isPending ? t('searching') : t('continue')}
        </Button>
      </form>
      <ReservationIdHelp className="-mt-4 mb-2" />
    </div>
  );
};

export default ReservationForm;
