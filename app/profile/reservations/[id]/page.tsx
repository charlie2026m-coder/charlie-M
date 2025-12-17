'use client'
import Image from 'next/image'
import StatusBadge from '@/app/_components/ui/StatusBadge'
import BookingCode from '../components/ui/bookingCode'
import { FaArrowLeft } from "react-icons/fa6";
import RoomParamsRow from '@/app/_components/ui/RoomParamsRow'
import { Beds24RoomType } from '@/types/beds24'
import Link from 'next/link';
import CheckInCheckOutDates from '@/app/_components/ui/CheckInCheckOutDates'
import UpgradeRoom from './components/UpgradeRoom'
import AddExtras from './components/AddExtras'
import PriceSection from './components/PriceSection'
import GuestsList from './components/GuestsList'
import { Button } from '@/app/_components/ui/button';

const ReservationPage = () => {
  return (
    <div className='flex flex-col flex-1'>
      <Link href='/profile/reservations'>
        <div className='flex items-center gap-2 border-b pb-5 mb-5 cursor-pointer'>
          <FaArrowLeft /> Back
        </div>
      </Link>
        
      <div className='flex flex-col bg-white mb-6'>
        <div className='flex items-center mb-6'>
          <div className='flex items-center'>
            <Image src={reservation.image} alt={reservation.name} width={125} height={125} className='size-[125px] object-cover rounded-2xl mr-3' />
          </div>

          <div className='flex flex-col gap-2.5 flex-1'>
            <div className='flex items-center self-start gap-2.5'>
              <StatusBadge status={reservation.checkInStatus}  isDot />
              <StatusBadge status={reservation.status} />

              <div className='text-sm '>id:237544</div>
            </div>
            <div className='flex flex-col gap-2.5'>
              <h2 className='text-xl jakarta font-bold'>{reservation.name}</h2>
              <div className='flex lg:hidden items-center justify-center px-2.5 py-1 text-brown rounded-full shadow text-sm self-start'>{reservation.category}</div>
              <div className='flex items-center gap-2'>
                <div className='hidden lg:flex items-center justify-center px-2.5 py-1 text-brown rounded-full shadow text-sm self-start'>{reservation.category}</div>
                <RoomParamsRow item={reservation as unknown as Beds24RoomType} />
              </div>
            </div>
            
          </div>
          <div className='flex w-1/3 '>
            <CheckInCheckOutDates from={reservation.checkIn} to={reservation.checkOut} />
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4 justify-center'>
          <BookingCode code={reservation.code} type='code' />
          <BookingCode code={reservation.roomNumber} type='room' />
        </div>
      </div>

      <div className='flex flex-col p-5 border rounded-2xl mb-10 bg-light-bg'>

        
        <GuestsList />
        <UpgradeRoom />
        <AddExtras />
        <PriceSection />
      </div>
      <Button variant='outline' className='ml-auto'>Cancel Booking</Button>
    </div>
  )
}

export default ReservationPage;



const reservation = {
  id: 1,
  checkInStatus: 'Pending Check-in', 
  name: 'Cozy Retreat Suite',
  date: '2025-01-01',
  checkIn: '2025-01-01',
  checkOut: '2025-01-02',
  status: 'upcoming',
  image: '/images/reservation_1.jpg',
  category: 'Suite',
  people: 2,
  roomSize: 50,
  roomType: 'Suite',
  hasBalcony: true,
  price: 1245.50,
  code: 123456,
  roomNumber: 101,
}

