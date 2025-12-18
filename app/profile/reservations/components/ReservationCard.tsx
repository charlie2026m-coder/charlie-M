'use client'
import dayjs from 'dayjs';
import Image from 'next/image'
import { BsFillPersonFill } from 'react-icons/bs'
import StatusBadge from '@/app/_components/ui/StatusBadge';
import { cn } from '@/lib/utils';
import { Separator } from '@/app/_components/ui/separator';
import { toast } from 'sonner';
import { AddExtrasButton, InfoButton, DetailsButton, BookAgainButton, InvoiceButton, CheckinButton } from './Buttons';
const ReservationCard = ({ reservation }: { reservation: any }  ) => {
  const { people, checkIn, checkOut, name, id, isCheckin, roomNumber, code } = reservation;
  const from = dayjs(checkIn).format('ddd D MMM YYYY');
  const to = dayjs(checkOut).format('ddd D MMM YYYY');
  const isCancelled = reservation.status === 'cancelled';
  const isCompleted = reservation.status === 'completed';
  const isActive = reservation.status === 'active';

  return (
    <div className='flex flex-col lg:flex-row bg-white border rounded-2xl p-3 relative'>
      <Image 
        src={reservation.image} 
        alt={name} 
        width={125} 
        height={125} 
        className='w-full h-[150px]  lg:size-[125px]  min-w-[125px] object-cover rounded-2xl mr-3' 
        />
      <div className='flex flex-col justify-center w-full'>
        <div className='flex items-center justify-between mb-2 mt-4 lg:mt-0'>
          <h2 className='text-xl jakarta font-bold '>{name}</h2>
          {isCancelled && <StatusBadge status='cancelled' className='lg:hidden' />}
            
        </div>
        <div className='flex flex-col lg:flex-row gap-1 lg:items-center text-sm text-mute mb-3'>
           <span className={cn('hidden lg:block',isCancelled && 'text-red-500')}>{from} - {to}</span>
           <span className={cn(' lg:hidden',isCancelled && 'text-red-500')}>{from}</span>
           <span className={cn(' lg:hidden',isCancelled && 'text-red-500')}>{to}</span>
           <span className='flex items-center gap-1'>
            <BsFillPersonFill className='size-4 text-red' /> {people} guests  
          </span>
        </div>
        <div className='flex gap-2.5 xl:items-center flex-col xl:flex-row '>
          {code && <RoomCode roomNumber={roomNumber} code={code} />}
          <div className='flex gap-2 grow flex-col lg:flex-row '>
            {code && <InfoButton />}
            {!isCheckin && <CheckinButton />}
            {isActive && <AddExtrasButton />}
            {(isCompleted || isCancelled) && <BookAgainButton />}
            {isCompleted  && <InvoiceButton />}
            <DetailsButton id={id} />
          </div>
        </div>


      </div>
      {isCancelled && <div className='absolute top-3 right-3 hidden lg:block'>
        <StatusBadge status='cancelled' />
      </div>}
    </div>
  )
}

export default ReservationCard;


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
    <div className='flex flex-col lg:flex-row lg:items-center rounded-lg border p-1 border-light1 gap-3 text-sm px-4 w-full lg:w-fit text-mute font-bold  '>
        <span className='text-xs'>Room </span>
        <div 
          className='rounded flex items-center justify-center bg-light-bg px-2 cursor-copy hover:bg-gray-200 transition-colors' 
          onClick={() => handleCopy(roomNumber, 'Room number')}
          title="Click to copy"
        >
          {roomNumber}
        </div>

      <Separator orientation='vertical' className='shrink hidden lg:block'/>
        <span className='text-xs'>Access Pin</span>
        <div 
          className='rounded flex items-center justify-center bg-light-bg px-2 cursor-copy hover:bg-gray-200 transition-colors'
          onClick={() => handleCopy(code, 'Code')}
          title="Click to copy"
        >
          {code}
        </div>
    </div>
  )
}