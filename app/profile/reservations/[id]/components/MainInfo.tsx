import { BookAgainButton, CheckinButton, ExtendButton } from './Buttons'
import { PiMapPinFill } from "react-icons/pi";
import MapWindow from '@/app/_components/footer/MapWindow';
import Image from 'next/image';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { Separator } from '@/app/_components/ui/separator';
import { ReservationButton } from './ReservationDetails';
import { RoomDetailsButton } from './RoomDetails';
import StatusBadge from '@/app/_components/ui/StatusBadge';
import { bookingStatuses } from '@/types/types';
import { cn } from '@/lib/utils';
const MainInfo = ({ reservation }: { reservation: any } ) => {
  const from = dayjs(reservation.arrival).format('ddd D MMM YYYY');
  const to = dayjs(reservation.departure).format('ddd D MMM YYYY');
  return (
    <div className='grid lg:grid-cols-2 gap-4 pb-6 px-3 lg:px-[30px]'>
    <div>
      <div className='flex  gap-3 mb-5'>
        <h2 className='text-[26px]  jakarta font-bold'>{reservation.name}</h2>
        {reservation.status === bookingStatuses.Cancelled && <StatusBadge status={bookingStatuses.Cancelled} className='h-[35px] items-center justify-center' />}
      </div>
      <div className='flex items-center gap-3 text-mute text-sm mb-3'>
        Check-in:
        <span className={cn(reservation.status === bookingStatuses.Cancelled && 'text-red-500')}>{from} 15:00 - 00:00</span>
      </div>
      <div className='flex items-center gap-3 text-mute text-sm mb-5'>
        Check-out:
        <span className={cn(reservation.status === bookingStatuses.Cancelled && 'text-red-500')}>{to} 11:00</span>
      </div>
      <div className='flex flex-col w-full lg:w-4/5 gap-3'>
        {!reservation.isCheckin && <CheckinButton />}
        {reservation.code && (<RoomCode roomNumber={reservation.roomNumber} code={reservation.code} />)}
        {(reservation.status === bookingStatuses.CheckedOut || reservation.status === bookingStatuses.Cancelled) && (<BookAgainButton />)}
        <ReservationButton reservation={reservation} />
        <RoomDetailsButton reservation={reservation} />
        {(reservation.status === bookingStatuses.Confirmed || reservation.status === bookingStatuses.InHouse) && (<ExtendButton />)}
      </div>  
    </div>

    <div className='flex flex-col rounded-lg shadow-lg self-start'>
      <Image src={reservation.image} alt={reservation.name} width={430} height={230} className='w-full h-[230px] object-cover rounded-t-2xl' />
      <div className='flex justify-between items-center px-3 py-5'>
        <div className='flex flex-col gap-2 w-1/2 lg:w-2/5'>
          <h4 className='font-semibold'>Location</h4>
          <div className='flex gap-1 items-center text-sm'>
            <PiMapPinFill className='size-6 min-w-6' />
            <span>Friedrichstraße 33, 10969 Berlin</span>
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

const RoomCode = ({roomNumber, code}: {roomNumber: number, code: number}) => {
  const handleCopy = async (text: string | number, label: string) => {
    try {
      await navigator.clipboard.writeText(text.toString());
      toast.success(`${label} copied to clipboard!`);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className='flex flex-col  gap-2'>
        <span className='text-xs '>Room № </span>
        <div 
          className='rounded border border-light1 flex items-center justify-center  px-2 py-2 cursor-copy hover:bg-gray-200 transition-colors font-bold' 
          onClick={() => handleCopy(roomNumber, 'Room number')}
          title="Click to copy"
        >
          {roomNumber}
        </div>

      <Separator orientation='vertical' className='shrink hidden lg:block'/>
        <span className='text-xs'>Access Pin</span>
        <div 
          className='rounded border border-light1 flex items-center justify-center  px-2 py-2 cursor-copy hover:bg-gray-200 transition-colors font-bold'
          onClick={() => handleCopy(code, 'Code')}
          title="Click to copy"
        >
          {code}
        </div>
    </div>
  )
}