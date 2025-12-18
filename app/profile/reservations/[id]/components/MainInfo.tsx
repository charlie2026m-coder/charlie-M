import { CheckinButton, ReservationButton, RoomButton, ExtendButton } from './Buttons'
import { PiMapPinFill } from "react-icons/pi";
import MapWindow from '@/app/_components/footer/MapWindow';
import Image from 'next/image';
import dayjs from 'dayjs';

const MainInfo = ({ reservation }: { reservation: any } ) => {
  return (
    <div className='grid lg:grid-cols-2 gap-4 pb-6 px-3 lg:px-[30px]'>
    <div>
      <h2 className='text-[26px] mb-5 jakarta font-bold'>{reservation.name}</h2>
      <div className='flex items-center gap-3 text-mute text-sm mb-3'>
        Check-in:
        <span>{dayjs(reservation.checkIn).format('ddd D MMM YYYY')} 15:00 - 00:00</span>
      </div>
      <div className='flex items-center gap-3 text-mute text-sm mb-5'>
        Check-out:
        <span>{dayjs(reservation.checkOut).format('ddd D MMM YYYY')} 11:00</span>
      </div>
      <div className='flex flex-col w-full lg:w-4/5 gap-3'>
        <CheckinButton />
        <ReservationButton />
        <RoomButton />
        <ExtendButton />
      </div>  
    </div>

    <div className='flex flex-col rounded-lg shadow-lg'>
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