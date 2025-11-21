'use client'

import Image from 'next/image'
import { Button } from '@/app/_components/ui/button'
import StatusBadge from '@/app/_components/ui/StatusBadge'
import Price from '@/app/_components/ui/price'
import { Separator } from '@/app/_components/ui/separator'
import BookingCode from './ui/bookingCode'
import Link from 'next/link'
import RoomParamsRow from '@/app/_components/ui/RoomParamsRow'
import { Beds24RoomType } from '@/types/beds24'


const ReservationCard = ({ reservation }: { reservation: any }  ) => {

  const isNoCodes = !reservation.code && !reservation.roomNumber;
  return (
    <div className='flex flex-col bg-white border rounded-2xl p-3 '>
      <div className='flex  mb-3'>
        <div className='flex items-center'>
          <Image src={reservation.image} alt={reservation.name} width={125} height={125} className='size-[125px] object-cover rounded-2xl mr-3' />
        </div>
        <div className='flex flex-col gap-2.5 flex-1'>
          <div className='flex flex-1 justify-between pb-3 border-b'>
            <div className='flex flex-col'>
              <div className='flex flex-col gap-2.5'>
                <h2 className='text-xl jakarta font-bold'>{reservation.name}</h2>
                <div className='flex lg:hidden items-center justify-center px-2.5 py-1 text-brown rounded-full shadow text-sm self-start'>{reservation.category}</div>
                <div className='flex items-center gap-2'>
                  <div className='hidden lg:flex items-center justify-center px-2.5 py-1 text-brown rounded-full shadow text-sm self-start'>{reservation.category}</div>
                  <RoomParamsRow item={reservation as unknown as Beds24RoomType} />
                </div>
              </div>
            </div>
            
            <div className='flex flex-col items-end gap-2'>
              <div className='flex items-center self-start gap-2.5'>
                <StatusBadge status={reservation.checkInStatus}  isDot />
                <StatusBadge status={reservation.status} />

                <div className='text-sm '>id:237544</div>
              </div>
              <Price
                price={reservation.price.toFixed(2)}
                className='h-[30px]'
              />
            </div>
          </div>
          <div className='flex items-center gap-2.5'>
            <div>Check In: {reservation.checkIn}</div>
            <Separator orientation='vertical' />
            <div>Check Out: {reservation.checkOut}</div>
            <Separator orientation='vertical' />
            <div>Guests: {reservation.people}</div>
            {isNoCodes && 
              <Link href={`reservations/${reservation.id}`} className='ml-auto'>
                <Button variant='outline' className='h-[35px] text-sm'>Check details</Button>
              </Link>
            }

          </div>
        </div>
      </div>

      <div className='flex gap-2 items-center'>
        <BookingCode code={reservation.code} type='code' />
        <BookingCode code={reservation.roomNumber} type='room' />
        {!isNoCodes &&
          <Link href={`reservations/${reservation.id}`} className='ml-auto'>
            <Button variant='outline' className='h-[35px] text-sm'>Check details</Button>
        </Link>}
      </div>
    </div>
  )
}

export default ReservationCard;
