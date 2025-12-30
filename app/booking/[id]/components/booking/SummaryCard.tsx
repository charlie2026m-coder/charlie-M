'use client'
import { useBookingStore } from '@/store/useBookingStore'
import Price from "@/app/_components/ui/price";
import { BiSolidLike } from "react-icons/bi";
import Image from 'next/image';
import { calculateNights } from '@/lib/utils';
import { TAX_RATE } from '@/lib/Constants';
import { BsCalendar2Fill } from 'react-icons/bs';
import dayjs from 'dayjs';
import { getExtraPrice } from '@/lib/utils';

const SummaryCard = () => {
  const { booking, rooms, roomDetails } = useBookingStore()

  if (!booking || !booking.reservations) {
    return (
      <div className='flex flex-col bg-white rounded-[20px] py-5 px-3 shadow-xl'>
        <h2 className='text-2xl font-bold mb-3 text-center'>Summary</h2>
        <p className='text-center text-gray-500'>No booking data available</p>
      </div>
    )
  }

  const { reservations } = booking
  const totalGuests = reservations[0].adults + (reservations[0].childrenAges?.length || 0)
  const nights = calculateNights(reservations[0].arrival, reservations[0].departure)
  const roomPrice = roomDetails?.price || 0

  const updatedRooms = rooms.map(room => {
    const updateExtras = room.extras?.map(extra => {
      return {
        ...extra,
        totalPrice: getExtraPrice(extra, room.adults + room.children, nights, reservations[0].arrival, reservations[0].departure),
      }
    })
    return {
      ...room,
      extras: updateExtras,
    }
  })


  const flatExtras = updatedRooms.flatMap(room => room.extras || [])
  const getText = (days: number) => days === 1 ? 'night' : 'nights'
  //calculate total price for rooms and extras
  const extrasTotalPrice = flatExtras.reduce((acc, extra) => acc + extra.totalPrice, 0)


  const tax = TAX_RATE
  const roomsTotalPrice = rooms.reduce((acc, _) => acc + roomPrice, 0)
  const totalPrice = roomsTotalPrice + extrasTotalPrice + tax

  return (
    <div className='flex flex-col bg-white rounded-[20px] py-5 px-3 shadow-xl self-start'>
      <h2 className='text-2xl font-bold mb-3 text-center'>Summary</h2>
      <Image 
        src="/images/room1.webp" 
        alt="summary" 
        width={327} 
        height={202} 
        className='w-full max-h-[202px] rounded-xl mb-3 object-cover'
      />

      <div className='text-[16px] flex justify-between font-[500] py-3 border-b mb-3'> 
        Guests: <span className='font-bold'>{totalGuests}</span>
      </div>

      <div className='flex flex-col'>
        <span className='font-semibold mb-4 text-[15px]'>Price:</span>
        <div className='flex flex-col gap-1 mb-3'>
          {rooms.map((room, index) => (
            <div key={room.id} className='flex flex-col gap-1 mb-2'>
              <div className='flex items-center gap-2 inter text-sm text-dark'>
                <span className='truncate overflow-hidden whitespace-nowrap'>Room {index + 1}</span>
                <span>€ {roomDetails?.averagePrice || 0}</span>×<span>{nights} {getText(nights)}</span>
                <span className='text-bale font-bold text-base ml-auto'>€ {roomPrice}</span>
              </div>
              <div className='flex gap-2 text-sm '>
                <BsCalendar2Fill className='size-4 cursor-pointer self-center text-blue' /> {dayjs(room.from).format('DD MMM YYYY')} - {dayjs(room.to).format('DD MMM YYYY')}
              </div>
            </div>
          ))}
          
        </div>
      </div>

      {reservations[0].services && reservations[0].services.length > 0 && (
        <div className='flex flex-col mb-5'>
          <span className='font-semibold mb-4 text-[15px]'>Extras:</span>
          {rooms.map((room, index) => (
            room.extras && room.extras.length > 0 && (
              <div key={room.id} className='flex flex-col gap-1 mb-2'>
                {room.extras.map((extra) => (
                  <div key={extra.id} className='flex items-center gap-2 inter text-sm text-dark'>
                    <span className='truncate'>Room {index + 1} - {extra.name}</span>
                    <span className='text-bale font-semibold ml-auto'>
                    </span>
                  </div>
                ))}
              </div>
            )
          ))}
          <div className='flex items-center justify-between gap-2 inter text-sm text-dark mb-2'>
            <span>Total:</span>
            <span className='text-bale font-semibold'>€ {extrasTotalPrice.toFixed(2)}</span>
          </div>
          <div className='flex items-center gap-2 inter text-sm text-dark mt-2'>
            <span>Tax:</span>
            <span className='text-bale font-semibold ml-auto'>€ {TAX_RATE}</span>
          </div>
        </div>
      )}

      <div className='flex items-center justify-between mb-3'>
        <span className='font-semibold text-lg'>Total price:</span>
        <Price price={totalPrice.toFixed(2)} />
      </div>
      <div className='flex justify-center p-1 bg-[#FFC10733] rounded-full text-[#D78426]'>
        <BiSolidLike className='size-6 text-[#D78426]' />
        -10% cheaper than on booking.com 
      </div> 
    </div>
  )
}

export default SummaryCard

const getText = (days: number) => days === 1 ? 'night' : 'nights'
