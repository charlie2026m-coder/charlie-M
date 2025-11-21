'use client'
import Image from 'next/image'
import StatusBadge from '@/app/_components/ui/StatusBadge'
import BookingCode from '../components/ui/bookingCode'
import { FaArrowLeft } from "react-icons/fa6";
import RoomParamsRow from '@/app/_components/ui/RoomParamsRow'
import { Beds24RoomType } from '@/types/beds24'
import Link from 'next/link';
import GuestCard from './components/GuestCard'
import Amenities from '@/app/rooms/components/Amenities'
import CheckInCheckOutDates from '@/app/_components/ui/CheckInCheckOutDates'
import { IoIosArrowDown } from "react-icons/io";
import { useState } from 'react'

const ReservationPage = () => {
  const [showGuests, setShowGuests] = useState(false)
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

      <div className='flex flex-col p-5 border rounded-2xl mb-10'>
        <div 
          className='flex items-center gap-2 text-lg font-semibold w-full cursor-pointer' 
          onClick={() => setShowGuests(!showGuests)}
        >
          Guests: 
          <IoIosArrowDown 
            className={`size-5 ml-auto transition-transform duration-300 ${showGuests ? 'rotate-180' : ''}`} 
          />
        </div>
        <div 
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            showGuests ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className='flex flex-col gap-5 mb-8 mt-5 border-t pt-5'>
            {
              guests.map((guest) => (
                <GuestCard key={guest.name} name={guest.name} birthdate={guest.birthdate} id={guest.id} nationality={guest.nationality} address={guest.address} />
              ))
            }
          </div>
        </div>
        {/* <div className='flex items-center gap-2 border-b pb-2 mb-5 text-lg font-semibold w-full'>
          Amenities:
        </div> */}
        {/* <Amenities title={false}/> */}

      </div>
      <div className='flex flex-col '>
        <div className='font-semibold mb-3 border-b'>Rooms:</div>
        {
          roomItems.map((item) => (
            <RoomItem key={item.name} name={item.name} price={item.price} quantity={item.nights} />
          ))
        }
        <div className='font-semibold my-3 border-b'>Extras:</div>
        {
          extraItems.map((item) => (
            <RoomItem key={item.name} name={item.name} price={item.price} quantity={item.quantity} />
          ))
        }
        <div className='font-semibold text-lg mt-5 flex items-center justify-between'>
          <div>Total: <span className='font-normal text-sm text-dark ml-2'>( Taxes and charges included )</span></div>
          <div className='font-bold text-green-600'>€ 1756.00</div>
        </div>
      </div>
    </div>
  )
}

export default ReservationPage;

const RoomItem = ({name, price, quantity}: {name: string, price: number, quantity: number}) =>{
  return (
    <div className='grid grid-cols-3 text-sm mb-1 pl-5'>
      <div className='col-span-1 '>
        {name}
      </div>
      <div className='col-span-1 text-dark'>
        € {price} x {quantity}
      </div>
      <div className='col-span-1 font-semibold text-right'>
        € {price * quantity}
      </div>
    </div>
  )
}

const roomItems = [
  {
    name: 'Tranquil Retreat Room',
    price: 179.00,
    nights: 1,
  },
  {
    name: 'Tranquil Retreat Room',
    price: 179.00,
    nights: 4,
  },
  { 
    name: 'Tranquil Retreat Room',
    price: 179.00,
    nights: 3,
  },
  {
    name: 'Tranquil Retreat Room',
    price: 179.00,
    nights: 2,
  },
]
const extraItems = [
  {
    name: 'Breakfast',
    price: 10.00,
    quantity: 15,
  },
  {
    name: 'Cleaning',
    price: 15.00,
    quantity: 1,
  },
  {
    name: 'Airport transfer',
    price: 50.00,
    quantity: 1,
  },
]

const guests = [
  {
    name: 'John Doe',
    birthdate: '1990-01-01',
    id: '1234567890',
    nationality: 'USA',
    address: '123 Main St, Anytown, USA',
  },
  {
    name: 'Anna Doe',
    birthdate: '1990-01-01',
    id: '1234567890',
    nationality: 'USA',
    address: '123 Main St, Anytown, USA',
  },
  {
    name: 'Bob Doe',
    birthdate: '1990-01-01',
    id: '1234567890',
    nationality: 'USA',
    address: '123 Main St, Anytown, USA',
  },
]


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

