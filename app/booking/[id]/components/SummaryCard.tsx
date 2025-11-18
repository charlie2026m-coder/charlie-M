'use client'
import { useBookingStore } from '@/store/bookingStore'

import { Separator } from "@/app/_components/ui/separator"
import { MdOutlineWatchLater } from "react-icons/md";
import dayjs from "dayjs";
import { FiInfo } from "react-icons/fi";
import Price from "@/app/_components/ui/price";
import { BiSolidLike } from "react-icons/bi";
import Image from 'next/image';
import { getExtrasPrice, getPeriodText, getPerText } from '@/lib/utils';

const SummaryCard = () => {
  const { booking } = useBookingStore()
  const guests = booking.guests.adults + booking.guests.children
  const extrasTotalPrice = booking.extras.reduce((acc, item) => acc + getExtrasPrice(item, booking.roomsAmount, booking.guests, booking.nights), 0)

  return (
    <div className='flex flex-col bg-white rounded-[20px] py-5 px-3 shadow-xl'>
      <h2 className='text-2xl font-bold mb-3 text-center'>Summary</h2>
      <Image 
        src="/images/room.jpg" 
        alt="summary" 
        width={327} 
        height={202} 
        className='w-full max-h-[202px] rounded-xl mb-3'
      />

      <div className='flex '>
        <div className='flex flex-col gap-2 items-center w-1/2'>
          <span>Check in</span>
          <span className='text-lg font-bold'>{dayjs(booking.arrival).format('DD MMM YYYY')}</span>
          <div className='flex items-center gap-1'>
            <MdOutlineWatchLater className='size-5 text-blue' />
            <span>11:30 - 14:30</span>
          </div>
        </div>
        <Separator orientation="vertical" />
        <div className='flex flex-col gap-2 items-center w-1/2'>
          <span>Check out</span>
          <span className='text-lg font-bold'>{dayjs(booking.departure).format('DD MMM YYYY')}</span>
          <div className='flex items-center gap-1'>
            <MdOutlineWatchLater className='size-5 text-blue' />
            <span>11:30 - 14:30</span>
          </div>
        </div>
      </div>

      <div className='text-[16px] flex justify-between font-[500] py-3 border-b mb-3'> 
        Guests: <span>{guests}</span>
      </div>

      <div className='flex flex-col'>
        <span className='font-semibold mb-1.5 text-[15px]'>Price:</span>
        <div className='flex flex-col gap-1 mb-5'>
          {booking.rooms.map((item, index) => (
            <div key={index} className='flex items-center gap-2 inter text-sm text-dark'>
              <span className=' truncate overflow-hidden whitespace-nowrap w-1/2'>{booking.name}</span>
              <span>{booking.price}</span>x<span>{booking.nights} {getText(booking.nights)}</span>
              <span className='text-bale font-semibold ml-auto'>€ {booking.price * booking.nights}</span>
            </div>
          ))}

        </div>
      </div>
      {
        booking.extras.length > 0 && (
          <div className='flex flex-col mb-5'>
            <span className='font-semibold mb-1.5 text-[15px]'>Extras:</span>
              {booking.extras.map(item => {
                const fullPrice = getExtrasPrice(item, booking.roomsAmount, booking.guests, booking.nights)
                const periodText = getPeriodText(item, booking.nights)
                const perText = getPerText(item, booking.roomsAmount, booking.guests)

                return (
                  <div key={item.index} className='flex  inter text-sm pb-1 text-dark'>
                    <div className='flex gap-2 items-center'>
                      <div className=' flex items-center gap-2' >
                        {item.name} <span className='text-xs text-brown'>( {periodText} x {perText} )</span> <FiInfo className='size-5 text-brown ml-2 cursor-pointer' />
                      </div>
                      
                    </div>
                    <span className='font-bold ml-auto'>€ {fullPrice}</span>
                  </div>
              )})}
            <div  className='flex items-center gap-2 inter text-sm text-dark'>
              <span >Tax</span>
              <span className='text-bale font-semibold ml-auto'>€ 85</span>
            </div>
            <div className='flex items-center justify-between gap-2 inter text-sm text-dark mt-2'>
              <div className=' flex items-center ' >
                Total:
              </div>
              <span className='text-bale font-semibold ml-auto'>€ {extrasTotalPrice}</span>
            </div>
          </div>
        )
      }
      <div className='flex items-center justify-between mb-3'>
          <span className='font-semibold text-lg'>Total price:</span>
          <Price price={booking.totalPrice.toFixed(2)} />
      </div>
      <div className='flex justify-center p-1 bg-[#FFC10733] rounded-full text text-[#D78426]'>
        <BiSolidLike className='size-6 text-[#D78426]' />
        -10% cheaper than on booking.com 
      </div> 
    </div>
  )
}

export default SummaryCard

const getText = (days: number) => days === 1 ? 'night' : 'nights'
