'use client'
import dayjs from 'dayjs';
import Image from 'next/image'
import { BsFillPersonFill } from 'react-icons/bs'
import StatusBadge from '@/app/_components/ui/StatusBadge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { IoCopy } from "react-icons/io5";
import { InfoButton, DetailsButton, BookAgainButton } from './Buttons';
import { bookingStatuses } from '@/types/types';
import { Reservation as ReservationType } from '@/types/apaleo';
import { Link } from '@/navigation';
import { useTranslations } from 'next-intl';
import { CheckinButton } from './CheckInButton';
import { InvoiceButton } from './InvoiceButton';
import { CheckedInLabel } from './CheckedInLabel';

const ReservationCard = ({ reservation }: { reservation: ReservationType }  ) => {
  const t = useTranslations('profile')
  const { status, arrival, departure, id, name, images, guests } = reservation;
  const from = dayjs(arrival).format('ddd D MMM YYYY');
  const to = dayjs(departure).format('ddd D MMM YYYY');
  const isCancelled = status === bookingStatuses.Canceled || status === bookingStatuses.NoShow;
  const isCheckedOut = status === bookingStatuses.CheckedOut;
  
  const isPincode = reservation.accesses?.pinCode;
  const isClosed = isCheckedOut || isCancelled;
  const showCheckInButton = !reservation.isPreCheckedIn && !isCancelled;
  const isCheckedIn = reservation.isPreCheckedIn && !isCancelled;
  return (
    <div className='flex flex-col lg:flex-row bg-white border rounded-2xl p-3 relative'>
      <Image 
        src={images?.[0] || '/images/room1.webp'} 
        alt={name} 
        width={125} 
        height={125} 
        className='w-full h-[150px]  lg:size-[125px]  min-w-[125px] object-cover rounded-2xl mr-3' 
        />
      <div className='flex flex-col justify-center w-full'>
        <div className='flex items-center justify-between mb-2 mt-4 lg:mt-0'>
          <Link href={`/profile/reservations/${id}`}>
            <h2 className='text-xl jakarta font-bold cursor-pointer  transition-colors'>{name}</h2>
          </Link>
          {isCancelled && <StatusBadge status={bookingStatuses.Canceled} className='lg:hidden' />}
            
        </div>
        <div className='flex flex-col lg:flex-row gap-1 lg:items-center text-sm text-mute mb-3'>
           <span className={cn('hidden lg:block',isCancelled && 'text-red-500')}>{from} - {to}</span>
           <span className={cn(' lg:hidden',isCancelled && 'text-red-500')}>{from}</span>
           <span className={cn(' lg:hidden',isCancelled && 'text-red-500')}>{to}</span>
           <span className='flex items-center gap-1'>
            <BsFillPersonFill className='size-4 text-red' /> {guests} {guests === 1 ? t('guest') : t('guests')}
          </span>
        </div>
        <div className='flex gap-2.5 xl:items-center flex-col xl:flex-row '>
          {(isPincode && !showCheckInButton) && <RoomCode roomNumber={reservation.accesses?.roomNumber || ''} code={reservation.accesses?.pinCode || ''} unitId={reservation.unit?.id || null} />}
          <div className='flex gap-2 grow flex-col lg:flex-row '>
            {showCheckInButton ? (
              <CheckinButton reservationId={id} />
            ) : (
              isCheckedIn && <CheckedInLabel isBig={false} />
            )}
            {isClosed && <BookAgainButton reservation={reservation} />}
            {isClosed && <InvoiceButton reservationId={id} className='h-[30px] ' />}
            <DetailsButton id={id} />
          </div>
        </div>


      </div>
      {isCancelled && <div className='absolute top-3 right-3 hidden lg:block'>
        <StatusBadge status={bookingStatuses.Canceled} />
      </div>}
    </div>
  )
}

export default ReservationCard;


const RoomCode = ({roomNumber, code, unitId}: {roomNumber: string, code: string, unitId: string | null | undefined}) => {
  const t = useTranslations('profile')
  
  const handleCopy = async (text: string | number, label: string) => {
    try {
      await navigator.clipboard.writeText(text.toString());
      toast.success(t('copiedToClipboard', { label }));
    } catch (err) {
      toast.error(t('failedToCopy'));
    }
  };

  return (
      <div className='flex gap-2 w-full lg:w-fit'>
        <div className='flex-1 lg:flex-initial rounded-full px-3 py-1.5 border border-blue/20 h-[30px] flex items-center justify-center'>
          <div className='flex items-center gap-2'>
            <span className='text-[10px] uppercase tracking-wider  font-semibold'>{t('room')}</span>
            <div className='text-sm font-bold  flex items-center gap-1'>
              {roomNumber}
            </div>
          </div>
        </div>

        <div 
          className='flex-1 lg:flex-initial bg-gradient-to-br from-green/5 to-green/10 rounded-full px-3 py-1.5 border border-green/20 hover:border-green/40 transition-all duration-300 hover:shadow-sm group h-[30px] flex items-center justify-center cursor-copy'
          onClick={() => handleCopy(code, t('code'))}
          title={t('clickToCopy')}
        >
          <div className='flex items-center gap-2'>
            <span className='text-[10px] uppercase tracking-wider text-green/70 font-semibold'>{t('accessPin')}</span>
            <div className='text-sm font-bold text-green flex items-center gap-1 group-hover:scale-105 transition-transform'>
              {code}
              <IoCopy className='w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity' />
            </div>
          </div>
        </div>
        
        <InfoButton unitId={unitId} />
      </div>
  )
}