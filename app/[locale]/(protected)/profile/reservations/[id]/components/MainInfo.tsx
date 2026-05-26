'use client'
import { BookAgainButton, CheckinButton, ExtendButton } from './Buttons'
import { PiMapPinFill } from "react-icons/pi";
import MapWindow from '@/app/_components/footer/MapWindow';
import Image from 'next/image';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { ReservationButton } from './ReservationDetails';
import { RoomDetailsButton } from './RoomDetails';
import StatusBadge from '@/app/_components/ui/StatusBadge';
import { bookingStatuses } from '@/types/types';
import { cn, isPinCodeAvailable } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { InvoiceButton } from '../../components/InvoiceButton';
import { canShowInvoice } from '@/lib/reservationStatus';
import { PinCodeComponent } from './PinCodeComponent';
import { HOTEL_INFO, DEFAULT_CHECKIN_TIME, DEFAULT_CHECKOUT_TIME } from '@/lib/Constants';
import { Floor } from './Floor';
import { CheckedInLabel } from '../../components/CheckedInLabel';

dayjs.extend(utc);
dayjs.extend(timezone);

const MainInfo = ({ reservation }: { reservation: any } ) => {
  const t = useTranslations('profile');
  
  const arrivalTimeMatch = reservation.arrival?.match(/T(\d{2}:\d{2})/);
  const departureTimeMatch = reservation.departure?.match(/T(\d{2}:\d{2})/);
  
  const arrivalTime = arrivalTimeMatch ? arrivalTimeMatch[1] : '00:00';
  const departureTime = departureTimeMatch ? departureTimeMatch[1] : '00:00';
  
  const arrivalDate = dayjs(reservation.arrival);
  const departureDate = dayjs(reservation.departure);
  const from = arrivalDate.format('ddd D MMM YYYY');
  const to = departureDate.format('ddd D MMM YYYY');
  
  // Convert to Berlin timezone if time exists, otherwise use default
  const checkInTime = arrivalTime !== '00:00' 
    ? `${dayjs.utc(reservation.arrival).tz('Europe/Berlin').format('HH:mm')} - 00:00`
    : DEFAULT_CHECKIN_TIME;
  
  const checkOutTime = departureTime !== '00:00'
    ? dayjs.utc(reservation.departure).tz('Europe/Berlin').format('HH:mm')
    : DEFAULT_CHECKOUT_TIME;
  
  const isCancelled = reservation.status === bookingStatuses.Canceled || reservation.status === bookingStatuses.NoShow;
  const isCheckedOut = reservation.status === bookingStatuses.CheckedOut;
  
  const isPincode = reservation.accesses?.pinCode && isPinCodeAvailable(reservation.arrival);
  const isClosed = isCheckedOut || isCancelled;
  const showInvoice = canShowInvoice(reservation);
  const isActive = reservation.status === bookingStatuses.Confirmed || reservation.status === bookingStatuses.InHouse;
  const showCheckInButton = !reservation.isPreCheckedIn && !isCancelled;
  const isCheckedIn = reservation.isPreCheckedIn && !isCancelled;
  return (
    <div className='grid lg:grid-cols-2 gap-4 pb-6 '>
    <div>
      <div className='flex  gap-3 mb-5'>
        <h2 className='text-[26px]  jakarta font-bold'>{reservation.name}</h2>
        {reservation.status === bookingStatuses.Canceled && <StatusBadge status={bookingStatuses.Canceled} className='h-[35px] items-center justify-center' />}
      </div>
      <div className='flex items-center gap-3 text-mute text-sm mb-3'>
        {t('checkIn')}:
        <span className={cn(reservation.status === bookingStatuses.Canceled && 'text-red-500')}>{from} {checkInTime}</span>
      </div>
      <div className='flex items-center gap-3 text-mute text-sm mb-5'>
        {t('checkOut')}:
        <span className={cn(reservation.status === bookingStatuses.Canceled && 'text-red-500')}>{to} {checkOutTime}</span>
      </div>
      <div className='flex flex-col w-full lg:w-4/5 gap-3'>
        {showCheckInButton ? (
          <CheckinButton reservationId={reservation.id} />
        ) : (
          isCheckedIn && <CheckedInLabel isBig={true} />
        )}
        {isPincode && !showCheckInButton && (
          <>
            <PinCodeComponent 
              roomNumber={reservation.accesses.roomNumber} 
              code={reservation.accesses.pinCode} 
            />
            <Floor unitId={reservation.unit?.id || null} />
          </>
        )}

        <ReservationButton reservation={reservation} />
        <RoomDetailsButton reservation={reservation} />

        {isClosed && <BookAgainButton reservation={reservation} />}
        {showInvoice && <InvoiceButton reservationId={reservation.id} className='!h-[35px] justify-start' />}

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

