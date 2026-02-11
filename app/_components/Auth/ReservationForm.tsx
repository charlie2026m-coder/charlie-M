import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useProfileStore } from '@/store/useProfile';

const ReservationForm = () => {
  const t = useTranslations('login');
  const [bookingId, setBookingId] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const { setGuestData } = useProfileStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bookingId.trim() || !lastName.trim()) {
      setError(t('checkBookingId'));
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      const response = await fetch(`/api/reservations/search-booking?bookingId=${encodeURIComponent(bookingId)}&lastName=${encodeURIComponent(lastName)}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 404) {
          setError(t('checkBookingId'));
        } else if (response.status === 403) {
          setError(t('noMatchesFound'));
        } else if (response.status >= 500) {
          setError(t('serverErrorTryAgain'));
        } else {
          setError(errorData.error || t('serverErrorTryAgain'));
        }
        setIsPending(false);
        return;
      }

      const data = await response.json();
      
      // Save full data to store and sessionStorage
      setGuestData(data);
      sessionStorage.setItem('guestMode', 'true');
      
      // Check if user is already signed in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Create anonymous session
        const { error: authError } = await supabase.auth.signInAnonymously();
        
        if (authError) {
          console.error('Error creating anonymous session:', authError);
          toast.error('Failed to create session');
          setIsPending(false);
          return;
        }
      }
      
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
          name="bookingId"
          type="text" 
          placeholder={t('enterBookingNumber')} 
          value={bookingId}
          onChange={(e) => {
            setBookingId(e.target.value);
            if (error) setError(null);
          }}
          disabled={isPending}
          className="w-full h-12 rounded-full px-5"
        />
        <Input 
          name="lastName"
          type="text" 
          placeholder={t('lastName')} 
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
          disabled={isPending || !bookingId.trim() || !lastName.trim()}
          className="w-full h-12 rounded-full bg-blue hover:bg-blue/80 font-medium !mb-0"
        >
          {isPending ? t('searching') : t('continue')}
        </Button>
      </form>
    </div>
  );
};

export default ReservationForm;
