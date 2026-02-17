'use client'
import { BookAgainButton, CheckinButton, ExtendButton } from './Buttons'
import { PiMapPinFill } from "react-icons/pi";
import MapWindow from '@/app/_components/footer/MapWindow';
import Image from 'next/image';
import dayjs from 'dayjs';
import { ReservationButton } from './ReservationDetails';
import { RoomDetailsButton } from './RoomDetails';
import StatusBadge from '@/app/_components/ui/StatusBadge';
import { bookingStatuses } from '@/types/types';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { InvoiceButton } from '../../components/InvoiceButton';
import { PinCodeComponent } from './PinCodeComponent';
import { HOTEL_INFO } from '@/lib/Constants';


const MainInfo = ({ reservation }: { reservation: any } ) => {
  const t = useTranslations('profile');
  const from = dayjs(reservation.arrival).format('ddd D MMM YYYY');
  const to = dayjs(reservation.departure).format('ddd D MMM YYYY');
  const isCancelled = reservation.status === bookingStatuses.Canceled || reservation.status === bookingStatuses.NoShow;
  const isCheckedOut = reservation.status === bookingStatuses.CheckedOut;
  
  const isPincode = reservation.accesses;
  const isClosed = isCheckedOut || isCancelled;
  const isActive = reservation.status === bookingStatuses.Confirmed || reservation.status === bookingStatuses.InHouse;
  const showCheckInButton = !reservation.isPreCheckedIn && !isCancelled;
  return (
    <div className='grid lg:grid-cols-2 gap-4 pb-6 '>
    <div>
      <div className='flex  gap-3 mb-5'>
        <h2 className='text-[26px]  jakarta font-bold'>{reservation.name}</h2>
        {reservation.status === bookingStatuses.Canceled && <StatusBadge status={bookingStatuses.Canceled} className='h-[35px] items-center justify-center' />}
      </div>
      <div className='flex items-center gap-3 text-mute text-sm mb-3'>
        {t('checkIn')}:
        <span className={cn(reservation.status === bookingStatuses.Canceled && 'text-red-500')}>{from} 15:00 - 00:00</span>
      </div>
      <div className='flex items-center gap-3 text-mute text-sm mb-5'>
        {t('checkOut')}:
        <span className={cn(reservation.status === bookingStatuses.Canceled && 'text-red-500')}>{to} 11:00</span>
      </div>
      <div className='flex flex-col w-full lg:w-4/5 gap-3'>
        {showCheckInButton && <CheckinButton reservationId={reservation.id} />}
        {isPincode && <PinCodeComponent roomNumber={111111} code={777777} />}

        <ReservationButton reservation={reservation} isActive={isActive} />
        <RoomDetailsButton reservation={reservation} />

        {isClosed && <BookAgainButton reservation={reservation} />}
        {isClosed && <InvoiceButton reservationId={reservation.id} className='!h-[35px] justify-start' />}

        {isActive && <ExtendButton />}
      </div>  
    </div>

    <div className='flex flex-col rounded-lg shadow-lg self-start'>
      <Image src={reservation.images?.[0] || '/images/room1.webp'} alt={reservation.name} width={430} height={230} className='w-full h-[230px] object-cover rounded-t-2xl' />
      <div className='flex justify-between items-center px-3 py-5'>
        <div className='flex flex-col gap-2 w-1/2 lg:w-2/5'>
          <h4 className='font-semibold'>{t('location')}</h4>
          <div className='flex gap-1 items-center text-sm'>
            <PiMapPinFill className='size-6 min-w-6' />
            <span>{HOTEL_INFO.address.streetAddress}, {HOTEL_INFO.address.postalCode} {HOTEL_INFO.address.addressLocality}</span>
          </div>
        </div>
        <div className='w-2/5'>
          <MapWindow width="100%" height="100px" isFullscreen={false} image='/images/logo-map.svg' />
        </div>

      </div>
    </div>
  </div>
  )
}

export default MainInfo

